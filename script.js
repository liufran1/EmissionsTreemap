function filterData(inputData, filterCountries = []) {
  // Mistral chat prompt - I have a javascript array of objects called ghgEmissionsBySector. Each object has a "Year" field, "Entity" field, and a "Code" field. Filter this array for entries where "Code" is not an empty string, and where "Year" is equal to the max value of "Year" for a given "Entity" value

  let maxYearsByEntity = inputData.reduce((acc, { Entity, Year }) => {
    acc[Entity] = Math.max(Year, acc[Entity] || 0);
    return acc;
  }, {});
  let filteredArray = inputData.filter(({ Code, Entity, Year }) => {
    return Code !== "" && Year === maxYearsByEntity[Entity];
  });

  if (filterCountries.length > 0) {
    return filteredArray.filter((d) => filterCountries.includes(d['Entity']))
  }
  else {
    return filteredArray
  }
}

function formatCountryData(inputData) {
  let hierarchyData = [{ name: "Origin", parent: "", value: "" }]

  inputData.forEach((d) => {
    let parentNode = { name: d["Entity"], parent: "Origin", value: "" }
    hierarchyData.push(parentNode)

    ghgFields.forEach((field) => {
      let childNode = { name: `${d["Entity"]} - ${field.replace("Greenhouse gas emissions from ", "")}`, parent: d["Entity"], value: d[field], sector: field }
      hierarchyData.push(childNode)
    })
  })
  return hierarchyData
}

function formatSectorData(inputData) {
  let hierarchyData = [{ name: "Origin", parent: "", value: "" }]

  ghgFields.forEach((field) => {
    let parentNode = { name: field, parent: "Origin", value: "" }
    hierarchyData.push(parentNode)

    inputData.forEach((d) => {
      let childNode = { name: `${d["Entity"]} - ${field.replace("Greenhouse gas emissions from ", "")}`, parent: field, value: d[field], country: d["Entity"] }
      hierarchyData.push(childNode)
    })
  })
  return hierarchyData
}

createPollutionMapGraphic = function() {
  let svgHeight = 500;
  let svgWidth = 1000;

  const svg = d3
    .select("#air_quality_map")
    .append("svg")
    .attr("height", svgHeight)
    .attr("width", svgWidth);


  d3.csv("data/ghg_emissions_by_sector.csv", (ghgEmissionsBySector) => {
    let countryData = formatCountryData(ghgEmissionsBySector);
    let sectorData = formatSectorData(ghgEmissionsBySector);
    let ghgRoot = d3.stratify()
      .id(function(d) { return d.name; })   // Name of the entity (column name is name in csv)
      .parentId(function(d) { return d.parent; })   // Name of the parent (column name is parent in csv)
      // (countryData);
      (countryData);


  })
}