/*
Variables
*/
// values for all forces

var height = document.querySelector("svg").height.baseVal.value;
var width = document.querySelector("svg").width.baseVal.value;

console.log(`SVG height ${height}, width ${width}`)

var forceProperties = {
    center: {
        x: 0.5,
        y: 0.5
    },
    charge: {
        enabled: true,
        strength: -50,
        distanceMin: 20,
        distanceMax: 2000
    },
    collide: {
        enabled: true,
        strength: .5,
        iterations: 1,
        radius: 50
    },
    forceX: {
        enabled: true,
        strength: .1,
        x: .05
    },
    forceY: {
        enabled: true,
        strength: .1,
        y: .05
    },
    link: {
        enabled: true,
        distance: 50,
        iterations: 3
    }
}

// force simulator
var simulation = d3.forceSimulation();

/* functions*/

function dragended(e, d) {
    if (!e.active) simulation.alphaTarget(0.0001);
    d.fx = null; d.fy = null;
}

function dragstarted(e, d) {
    if (!e.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x; d.fy = d.y;
}

function dragged(e, d) {
    d.fx = e.x; d.fy = e.y;
}

var updateForces = (simulation, data) => {
    // get each force by name and update the properties
    simulation.force("center")
        .x(width * forceProperties.center.x)
        .y(height * forceProperties.center.y);
    simulation.force("charge",d3.forceManyBody())
    // simulation.force("charge")
    //     .strength(forceProperties.charge.strength * forceProperties.charge.enabled)
    //     .distanceMin(forceProperties.charge.distanceMin)
    //     .distanceMax(forceProperties.charge.distanceMax);
    simulation.force("collide")
        .strength(forceProperties.collide.strength * forceProperties.collide.enabled)
        .radius(forceProperties.collide.radius)
        .iterations(forceProperties.collide.iterations);
    simulation.force("forceX")
        .strength(forceProperties.forceX.strength * forceProperties.forceX.enabled)
        .x(width * forceProperties.forceX.x);
    simulation.force("forceY")
        .strength(forceProperties.forceY.strength * forceProperties.forceY.enabled)
        .y(height * forceProperties.forceY.y);
    simulation.force("link")
        .id(d=>d.id)
        .distance(forceProperties.link.distance)
        .iterations(forceProperties.link.iterations)
        .links(forceProperties.link.enabled ? data.d3links : []);

    // updates ignored until this is run
    // restarts the simulation (important if simulation has already slowed down)
    simulation.alpha(1).restart();
}

var initializeForces = (simulation, data) => {
    // add forces and associate each with a name
    simulation
        .force("link", d3.forceLink())
        .force("charge", d3.forceManyBody())
        .force("collide", d3.forceCollide())
        .force("center", d3.forceCenter())
        .force("forceX", d3.forceX())
        .force("forceY", d3.forceY());

    // apply properties to each of the forces
    updateForces(simulation, data);
}

var ticked = (data) =>{
    var ticked_ = () => {
        data.d3links
            .attr("x1", function(d) { return d.source.x; })
            .attr("y1", function(d) { return d.source.y; })
            .attr("x2", function(d) { return d.target.x; })
            .attr("y2", function(d) { return d.target.y; })

        data.d3nodes
            .attr("transform", (d) => { return `translate(${d.x},${d.y})` })
    }
return ticked_
}

var initializeSimulation = (simulation, data) => {
    simulation.nodes(data.nodes);
    initializeForces(simulation, data);
    simulation.on("tick", ticked(data));
}

export {
    forceProperties, simulation, height, width,
    updateForces,
    dragended, dragstarted, dragged,
    initializeSimulation, initializeForces
}