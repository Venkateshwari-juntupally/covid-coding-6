const express = require("express");
const path = require("path");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const app = express();
app.use(express.json());
const dbPath = path.join(__dirname, "covid19India.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();
const convertDbObjectToResponseObject = (dbObject) => {
  return {
    stateId: dbObject.state_id,
    stateName: dbObject.state_name,
    population: dbObject.population,
    districtId: dbObject.district_id,
    districtName: dbObject.district_name,
    cases: dbObject.cases,
    cured: dbObject.cured,
    active: dbObject.active,
    deaths: dbObject.deaths,
  };
};

app.get("/states/", async (request, response) => {
  const getStatesQuery = `
    SELECT
      *
    FROM
      state
    ORDER BY
      state_id;`;
  const statesArray = await db.all(getStatesQuery);
  response.send(
    statesArray.map((eachState) => convertDbObjectToResponseObject(eachState))
  );
});
app.get("/states/:stateId/", async (request, response) => {
  const { stateId } = request.params;
  const getStateQuery = `
    SELECT
      *
    FROM
      state
    WHERE
      state_id = ${stateId};`;
  const state = await db.get(getStateQuery);
  response.send(convertDbObjectToResponseObject(state));
});
app.post("/districts/", async (request, response) => {
  const districtDetails = request.body;
  const {
    districtName,
    stateId,
    cases,
    cured,
    active,
    deaths,
  } = districtDetails;
  const addStateQuery = `
    INSERT INTO
      district (district_name, state_id, cases, cured, active, deaths)
    VALUES
      (
        '${districtName}',
         ${stateId},
         ${cases},
         ${cured},
         ${active},
         ${deaths}
      );`;
  const dbResponse = await db.run(addStateQuery);
  const districtId = dbResponse.lastID;
  response.send("District Successfully Added");
});
app.get("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const getDistrictQuery = `
    SELECT
      *
    FROM
      district
    WHERE
      district_id = ${districtId};`;
  const state = await db.get(getDistrictQuery);
  response.send(convertDbObjectToResponseObject(state));
});
app.delete("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const deleteDistrictQuery = `
    DELETE FROM
      district
    WHERE
      district_id = ${districtId};`;
  await db.run(deleteDistrictQuery);
  response.send("District Removed");
});
app.put("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const districtDetails = request.body;
  const {
    districtName,
    stateId,
    cases,
    cured,
    active,
    deaths,
  } = districtDetails;
  const updateDistrictQuery = `
    UPDATE
      district
    SET
      district_name='${districtName}',
      state_id=${stateId},
      cases=${cases},
      cured=${cured},
      active=${active},
      deaths=${deaths}
    WHERE
      district_id = ${districtId};`;
  await db.run(updateDistrictQuery);
  response.send("District Details Updated");
});
app.get("/states/:stateId/stats/", async (request, response) => {
  const { stateId } = request.params;
  const getStateQuery = `
    SELECT
      SUM(cases) AS totalCases,
      SUM(cured) AS totalCured,
      SUM(active) AS totalActive,
      SUM(deaths) AS totalDeaths
    FROM
      district
    WHERE
      state_id = ${stateId};`;
  const state = await db.get(getStateQuery);
  response.send(state);
});
app.get("/districts/:districtId/details/", async (request, response) => {
  const { districtId } = request.params;
  const getDistrictIdQuery = `
    SELECT 
        state_id
    FROM 
        district
    WHERE 
        district_id = ${districtId};`; //With this we will get the state_id using district table
  const getDistrictIdQueryResponse = await db.get(getDistrictIdQuery);
  const getStateNameQuery = `
    SELECT 
        state_name AS stateName 
    FROM 
        state
    WHERE 
        state_id = ${getDistrictIdQueryResponse.state_id};`; //With this we will get state_name as stateName using the state_id
  const getStateNameQueryResponse = await db.get(getStateNameQuery);
  response.send(getStateNameQueryResponse);
});

module.exports = app;
