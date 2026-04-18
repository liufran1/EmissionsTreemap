// const ghgFields = ["Greenhouse gas emissions from electricity and heat", "Greenhouse gas emissions from transport", "Greenhouse gas emissions from manufacturing and construction", "Greenhouse gas emissions from agriculture", "Fugitive emissions of greenhouse gases from energy production", "Greenhouse gas emissions from industry", "Greenhouse gas emissions from buildings", "Greenhouse gas emissions from waste", "Greenhouse gas emissions from land use change and forestry", "Greenhouse gas emissions from bunker fuels", "Greenhouse gas emissions from other fuel combustion"]
const ghgFields = [
    'Electricity and heat', 
    'Transport', 
    'Manufacturing and construction',
    'Industry', 
    'Agriculture', 
    'Aviation and shipping',
    'Land-use change and forestry',
    'Waste', 
    'Buildings', 
    'Fugitive emissions',
    'Other fuel combustion'
    ]


function filterData(inputData, filterCountries = []) {

    let maxYearsByEntity = inputData.reduce((acc, { Entity, Year }) => {
        acc[Entity] = Math.max(Year, acc[Entity] || 0);
        return acc;
    }, {});

    let filteredArray = inputData.filter(({ Code, Entity, Year }) => {
        return Code !== "" && Year === maxYearsByEntity[Entity] && Code !== null && !Code.includes("OWID_");
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
            if (d[field] > 0) {
                let childNode = { name: `${d["Entity"]} - ${field.replace("Greenhouse gas emissions from ", "")}`, parent: d["Entity"], value: d[field], sector: field, country: d["Entity"], id: `${d["Entity"]}-${field}` }
                hierarchyData.push(childNode)
            }
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
            if (d[field] > 0) {
                let childNode = { name: `${d["Entity"]} - ${field.replace("Greenhouse gas emissions from ", "")}`, parent: field, value: d[field], country: d["Entity"], id: `${d["Entity"]}-${field}` }
                hierarchyData.push(childNode)
            }
        })
    })
    return hierarchyData
}



let topCountries = ['China', 'United States', 'India', 'Russia', 'Indonesia', 'Brazil', 'Japan', 'Iran', 'Canada']

// let colors = d3.scaleOrdinal()
//     .domain(topCountries)
//     .range(d3.schemeAccent)


function plotTreeMap(inputData, svgHeight, svgWidth, svg, _isInitial, colors, tooltip) {

    svg.attr("height", svgHeight).attr("width", svgWidth);

    let ghgRoot = d3.stratify()
        .id(function(d) { return d.name; })
        .parentId(function(d) { return d.parent; })
        (inputData);

    ghgRoot.sum(function(d) { return +d.value })

    const treemap = d3.treemap()
        .size([svgWidth, svgHeight])
        .padding(2);

    const allNodes = treemap(ghgRoot).descendants();
    const leafNodes = allNodes.filter(d => d.height === 0);
    const isCountryView = leafNodes.length > 0 && !ghgFields.includes(leafNodes[0].parent.data.name);
    const countryNodes = isCountryView ? allNodes.filter(d => d.depth === 1 && !topCountries.includes(d.data.name)) : [];

    // console.log(leafNodes);

    const rects = svg.selectAll("rect")
        .data(leafNodes, d => d.id);

    const rectsUpdate = rects.enter()
        .append("rect")
        .merge(rects);

    rectsUpdate
        .on("mouseover", function(event, d) {
            const value = d.value ? (d.value/1000000).toLocaleString(undefined, { maximumFractionDigits: 1 }) : "N/A";
            tooltip.html(`<strong>${d.data.name}</strong><br/>${value} million tCO2e`)
                .classed("visible", true);
        })
        .on("mousemove", function(event) {
            tooltip.style("left", `${event.pageX + 12}px`)
                .style("top", `${event.pageY + 12}px`);
        })
        .on("mouseout", function() {
            tooltip.classed("visible", false);
        })
        .transition()
        .duration(750)
        .attr('x', (d) => d.x0)
        .attr('y', (d) => d.y0)
        .attr('width', (d) => d.x1 - d.x0)
        .attr('height', (d) => d.y1 - d.y0)
        .style("stroke", "black")
        .attr("fill", (d) => colors(d["data"]["country"]));

    rects.exit().remove();

    // Leaf texts
    const leafTexts = svg.selectAll(".leaf-text")
        .data(leafNodes, d => d.id);

    leafTexts.enter()
        .append("text")
        .attr("class", "leaf-text")
        .merge(leafTexts)
        .transition()
        .duration(750)
        .attr("x", function(d) { return d.x0 + 10 })
        .attr("y", function(d) { return d.y0 + 20 })
        .text((d) => topCountries.includes(d.data.country) ? d.data.name : "")
        .attr("font-size", "10px")
        .attr("fill", "white");

    leafTexts.exit().remove();

    // Country texts for non-top countries
    const countryTexts = svg.selectAll(".country-text")
        .data(countryNodes, d => d.id);

    countryTexts.enter()
        .append("text")
        .attr("class", "country-text")
        .merge(countryTexts)
        .attr("x", d => (d.x0 + d.x1) / 2)
        .attr("y", d => (d.y0 + d.y1) / 2)
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .text(d => d.data.name)
        .attr("font-size", "14px")
        .attr("fill", "black");

    countryTexts.exit().remove();
}




createPollutionMapGraphic = function() {
    console.log("loading data")
    let baseHeight = 2000;
    let baseWidth = window.innerWidth * 0.9;


    const svg = d3
        .select("#viz")
        .append("svg")
        .attr("height", baseHeight)
        .attr("width", baseWidth);


    d3.csv("data/ghg-emissions-by-sector.csv", d3.autoType).then((ghgEmissionsBySector) => {
        let filteredArray = filterData(ghgEmissionsBySector)
        console.log("data loaded")
        document.getElementById('loaddiv').remove()

        let fullTotal = d3.sum(filteredArray, d => ghgFields.reduce((sum, field) => sum + (d[field] || 0), 0));
        let currentFilteredArray = filteredArray;

        // Populate datalist with countries
        const countries = [...new Set(filteredArray.map(d => d.Entity))].sort();
        d3.select("#countries").selectAll("option")
            .data(countries)
            .enter()
            .append("option")
            .attr("value", d => d);

        let currentFilter = [];

        let countryData = formatCountryData(filteredArray);
        let sectorData = formatSectorData(filteredArray);

        let colors = function(country) {
            let countryArray = filteredArray.map((d) => d["Entity"]).slice(0, 30)

            // Check if the input string is in the array
            if (countryArray.includes(country)) {
                // Get the index of the input string in the array
                const index = countryArray.indexOf(country);

                // Map the index to a number between 0 and 1
                const mappedNumber = 1 - (index / (countryArray.length - 1));

                return d3.scaleSequential(d3.interpolateReds)(mappedNumber);
            } else {
                // Return null or another default value if the input string is not in the array
                return "rgb(255, 255, 255)";
            }
        }

        let currentData = countryData;

        function updateFilter(value) {
            currentFilter = value ? [value] : [];
            const newFilteredArray = filterData(ghgEmissionsBySector, currentFilter);
            currentFilteredArray = newFilteredArray;
            const newCountryData = formatCountryData(newFilteredArray);
            const newSectorData = formatSectorData(newFilteredArray);
            currentData = currentData === countryData ? newCountryData : newSectorData;
            countryData = newCountryData;
            sectorData = newSectorData;

            colors = function(country) {
                let countryArray = newFilteredArray.map((d) => d["Entity"]).slice(0, 30)
                if (countryArray.includes(country)) {
                    const index = countryArray.indexOf(country);
                    const mappedNumber = 1 - (index / (countryArray.length - 1));
                    return d3.scaleSequential(d3.interpolateReds)(mappedNumber);
                } else {
                    return "rgb(255, 255, 255)";
                }
            }

            const filteredTotal = d3.sum(newFilteredArray, d => ghgFields.reduce((sum, field) => sum + (d[field] || 0), 0));
            const scale = Math.sqrt(filteredTotal / fullTotal);
            const currentHeight = baseHeight * scale;
            const currentWidth = baseWidth * scale;

            plotTreeMap(currentData, currentHeight, currentWidth, svg, false, colors, tooltip);
        }

        function toggleData() {
            if (currentData === countryData) {
                currentData = sectorData;
                d3.select("#toggle-data").text("Switch to country view");
            } else {
                currentData = countryData;
                d3.select("#toggle-data").text("Switch to sector view");
                
            }

            const currentTotal = d3.sum(currentFilteredArray, d => ghgFields.reduce((sum, field) => sum + (d[field] || 0), 0));
            const scale = Math.sqrt(currentTotal / fullTotal);
            const currentHeight = baseHeight * scale;
            const currentWidth = baseWidth * scale;

            plotTreeMap(currentData, currentHeight, currentWidth, svg, false, colors, tooltip);
        }

        const tooltip = d3.select("body")
            .append("div")
            .attr("class", "tooltip");
        
        d3.select("#toggle-data").on("click", toggleData);

        // Filter listener
        d3.select("#country-filter").on("input", function() {
            updateFilter(this.value.trim());
            // d3.select("#toggle-data").setAttribute("disabled", "true");
        });

        // Clear filter button
        d3.select("#clear-filter").on("click", function() {
            d3.select("#country-filter").property("value", "");
            updateFilter("");
            // d3.select("#toggle-data").removeAttribute("disabled");
        });

        plotTreeMap(countryData, baseHeight, baseWidth, svg, true, colors, tooltip);
    })
}

createPollutionMapGraphic()