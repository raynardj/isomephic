/*
Variables
*/
// values for all forces

var height = document.querySelector("svg").height.baseVal.value;
var width = document.querySelector("svg").width.baseVal.value;

var forceProperties = {
    center: {
        x: 0.5,
        y: 0.5
    },
    charge: {
        enabled: true,
        strength: -50,
        distanceMin: 1,
        distanceMax: 2000
    },
    collide: {
        enabled: true,
        strength: .7,
        iterations: 1,
        radius: 10
    },
    forceX: {
        enabled: false,
        strength: .1,
        x: .5
    },
    forceY: {
        enabled: false,
        strength: .1,
        y: .5
    },
    link: {
        enabled: true,
        distance: 30,
        iterations: 1
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

var updateForces = (simulation) => {
    // get each force by name and update the properties
    simulation.force("center")
        .x(width * forceProperties.center.x)
        .y(height * forceProperties.center.y);
    simulation.force("charge")
        .strength(forceProperties.charge.strength * forceProperties.charge.enabled)
        .distanceMin(forceProperties.charge.distanceMin)
        .distanceMax(forceProperties.charge.distanceMax);
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
        .id(function (d) { return d.id; })
        .distance(forceProperties.link.distance)
        .iterations(forceProperties.link.iterations)
        .links(forceProperties.link.enabled ? window.links : []);

    // updates ignored until this is run
    // restarts the simulation (important if simulation has already slowed down)
    simulation.alpha(1).restart();
}

var initializeForces = (simulation) => {
    // add forces and associate each with a name
    simulation
        .force("link", d3.forceLink())
        .force("charge", d3.forceManyBody())
        .force("collide", d3.forceCollide())
        .force("center", d3.forceCenter())
        .force("forceX", d3.forceX())
        .force("forceY", d3.forceY());
    // apply properties to each of the forces
    updateForces(simulation);
}

var ticked = () => {
    // window.link
    //     .attr("x1", function(d) { return d.source.x; })
    //     .attr("y1", function(d) { return d.source.y; })
    //     .attr("x2", function(d) { return d.target.x; })
    //     .attr("y2", function(d) { return d.target.y; });

    window.d3nodes
        .attr("transform", (d) => { return `translate(${d.x},${d.y})` })
    // .attr("x", function (d) { return d.x; })
    // .attr("y", function (d) { return d.y; });
    // d3.select('#alpha_value').style('flex-basis', (simulation.alpha()*100) + '%');
}

var initializeSimulation = (simulation, nodes) => {
    simulation.nodes(nodes);
    initializeForces(simulation);
    simulation.on("tick", ticked);
}

export {
    forceProperties, simulation, height, width,
    updateForces,
    dragended, dragstarted, dragged,
    initializeSimulation, initializeForces
}