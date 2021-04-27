/*
Imports
*/

import {
    gather_nodes
} from "./paint.js"

import { transaction, byId, idVal } from "./utils.js"

var search_name = (text, callback, error_handler) => {
    var search_query = `'${text.split(",").join(`','`)}'`
    transaction({
        statements: [
            {
                statement: `
                MATCH (n: Item)
                WHERE n.${window.iso_config.name_kw}
                    IN [${search_query}]
                RETURN n LIMIT 20`,
                parameters: {},
            },
        ]
    }, callback, error_handler)
}

var process_input = () => {
    search_name(
        idVal("search"), gather_nodes, console.error)
}

byId("search_btn").addEventListener("click", process_input)