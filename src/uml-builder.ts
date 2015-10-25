/// <reference path="typings/graphviz/graphviz.d.ts"/>

import * as graphviz from "graphviz";
import { Element, Module, Class, Method, Property, Visibility, QualifiedName } from "./ts-elements";
import { Collections } from "./extensions";

export function buildUml(modules: Module[], outputFilename: string) {
	let g: graphviz.Graph = graphviz.digraph("G");

	const FontSizeKey = "fontsize";
	const FontSize = 12;
	const FontNameKey = "fontname";
	const FontName = "Verdana";
	
	// set diagram default styles
	g.set(FontSizeKey, FontSize);
	g.set(FontNameKey, FontName);
	g.setEdgeAttribut(FontSizeKey, FontSize);
	g.setEdgeAttribut(FontNameKey, FontName);
	g.setNodeAttribut(FontSizeKey, FontSize);
	g.setNodeAttribut(FontNameKey, FontName);
	g.setNodeAttribut("shape", "record");
	
	modules.forEach(module => {
		buildModule(module, g, "", 0);
	});
	
	// TODO check if exists on PATH
	// Set GraphViz path (if not in your path)
	g.setGraphVizPath("/usr/local/bin");
	
	// Generate a PNG output
	g.output("png", outputFilename);
}

function buildModule(module: Module, g: graphviz.Graph, path: string, level: number) {
	const ModulePrefix = "cluster_";
	
	let moduleId = getGraphNodeId(path, module.name);
	let cluster = g.addCluster(ModulePrefix + moduleId);
	
	cluster.set("label", (module.visibility !== Visibility.Public ? visibilityToString(module.visibility) + " " : "") + module.name);
	cluster.set("style", "filled");
	cluster.set("color", "gray" + Math.max(40, (95 - (level * 6))));
	
	let moduleMethods = combineSignatures(module.methods, getMethodSignature);
	if (moduleMethods) {
		cluster.addNode(
			getGraphNodeId(path, module.name),
			{ 
				"label": moduleMethods,
				"shape": "none"
			});
	}
	
	module.modules.forEach(childModule => {
		buildModule(childModule, cluster, moduleId, level + 1);
	});
	
	module.classes.forEach(childClass => {
		buildClass(childClass, cluster, moduleId);
	});
	
	return;
	Collections.distinct(module.dependencies, d => d.name).forEach(d => {
		g.addEdge(module.name, getGraphNodeId("", d.name));
	});
}

function buildClass(classDef: Class, g: graphviz.Graph, path: string) {
	let methodsSignatures = combineSignatures(classDef.methods, getMethodSignature);
	let propertiesSignatures = combineSignatures(classDef.properties, getPropertySignature);
	
	let classNode = g.addNode(
		getGraphNodeId(path, classDef.name),
		{ 
			"label": "{" + [ classDef.name, methodsSignatures, propertiesSignatures].filter(e => e.length > 0).join("|") + "}"
		});
	
	if(classDef.extends) {
		// add inheritance arrow
		g.addEdge(
			classNode, 
			classDef.extends.parts.reduce((path, name) => getGraphNodeId(path, name), ""), 
			{ "arrowhead": "onormal" });
	}
}

function combineSignatures<T extends Element>(elements: T[], map: (e: T) => string): string {
	return elements.filter(e => e.visibility == Visibility.Public)
		.map(e => map(e) + "\\l")
		.join("");
}

function getMethodSignature(method: Method): string {
	return visibilityToString(method.visibility) + " " + method.name + "()";
}

function getPropertySignature(property: Property): string {
	return visibilityToString(property.visibility) + 
		" " + 
		(property.hasGetter ? "get" : "") + 
		(property.hasGetter && property.hasSetter ? "/" : "") + 
		(property.hasSetter ? "set" : "") + 
		" " + 
		property.name;
}

function visibilityToString(visibility: Visibility) {
	switch(visibility) {
		case Visibility.Public:
			return "+";
		case Visibility.Protected:
			return "~";
		case Visibility.Private:
			return "-";		
	}
}

function getGraphNodeId(path: string, name: string): string {
	return ((path ? path + "÷" : "") + name).replace(/\//g, "|");
}