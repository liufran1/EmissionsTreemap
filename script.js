const ghgFields = ['Greenhouse gas emissions from agriculture', 'Greenhouse gas emissions from land use change and forestry', 'Greenhouse gas emissions from waste', 'Greenhouse gas emissions from buildings', 'Greenhouse gas emissions from industry', 'Greenhouse gas emissions from manufacturing and construction', 'Greenhouse gas emissions from transport', 'Greenhouse gas emissions from electricity and heat', 'Fugitive emissions of greenhouse gases from energy production', 'Greenhouse gas emissions from other fuel combustion', 'Greenhouse gas emissions from bunker fuels']


function filterData(inputData, filterCountries = []) {

    let maxYearsByEntity = inputData.reduce((acc, { Entity, Year }) => {
        acc[Entity] = Math.max(Year, acc[Entity] || 0);
        return acc;
    }, {});

    let filteredArray = inputData.filter(({ Code, Entity, Year }) => {
        return Code !== "" && Year === maxYearsByEntity[Entity] && Code !== null && Code !== "OWID_WRL";
    });

    filteredArray.sort((a, b) => {
        const sumA = ghgFields.reduce((sum, field) => sum + (a[field] || 0), 0);
        const sumB = ghgFields.reduce((sum, field) => sum + (b[field] || 0), 0);
        return sumB - sumA;
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


let topCountries = ['China', 'United States', 'India', 'Russia', 'Indonesia', 'Brazil', 'Japan', 'Iran', 'Canada']

let colors = d3.scaleOrdinal()
    .domain(topCountries)
    .range(d3.schemeAccent)


function plotTreeMap(inputData, svgHeight, svgWidth, svg, isInitial) {
    let ghgRoot = d3.stratify()
        .id(function(d) { return d.name; })
        .parentId(function(d) { return d.parent; })
        (inputData);

    ghgRoot.sum(function(d) { return +d.value })

    const treemap = d3.treemap()
        .size([svgWidth, svgHeight])
        .padding(2);

    const nodes = treemap(ghgRoot).leaves()

    console.log(nodes);

    const rects = svg.selectAll("rect")
        .data(nodes);

    rects.enter()
        .append("rect")
        .merge(rects)
        .transition()
        .duration(750)
        .attr('x', (d) => d.x0)
        .attr('y', (d) => d.y0)
        .attr('width', (d) => d.x1 - d.x0)
        .attr('height', (d) => d.y1 - d.y0)
        .style("stroke", "black")
        .attr("fill", (d) => colors(d["data"]["country"]));

    rects.exit().remove();

    // ... (do the same for the text elements)

    const texts = svg.selectAll("text")
        .data(nodes);

    texts.enter()
        .append("text")
        .merge(texts)
        .transition()
        .duration(750)
        .attr("x", function(d) { return d.x0 + 10 })
        .attr("y", function(d) { return d.y0 + 20 })
        .text((d) => { return d.data.name })
        .attr("font-size", "10px")
        .attr("fill", "white");

    texts.exit().remove();
}




createPollutionMapGraphic = function() {
    let svgHeight = 20000;
    let svgWidth = 1000;

    const svg = d3
        .select("#viz")
        .append("svg")
        .attr("height", svgHeight)
        .attr("width", svgWidth);


    d3.csv("data/ghg-emissions-by-sector.csv", d3.autoType).then((ghgEmissionsBySector) => {
        let filteredArray = filterData(ghgEmissionsBySector)

        let countryData = formatCountryData(filteredArray);
        let sectorData = formatSectorData(filteredArray);

        let currentData = countryData;

        function toggleData() {
            if (currentData === countryData) {
                currentData = sectorData;
            } else {
                currentData = countryData;
            }

            plotTreeMap(currentData, svgHeight, svgWidth, svg, false);
        }

        d3.select("#toggle-data").on("click", toggleData);

        plotTreeMap(countryData, svgHeight, svgWidth, svg, true);
    })
}

createPollutionMapGraphic()