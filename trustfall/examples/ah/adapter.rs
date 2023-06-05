#![allow(dead_code)]

use serde_json::Value;
use trustfall::{
    provider::{
        resolve_coercion_with, resolve_neighbors_with, resolve_property_with, BasicAdapter,
        ContextIterator, ContextOutcomeIterator, EdgeParameters, VertexIterator,
    },
    FieldValue,
};

use crate::vertex::Vertex;

#[derive(Clone, Default)]
pub struct AuctionHouseAdapter<'a> {
    data: &'a [Value],
}

impl<'a> AuctionHouseAdapter<'a> {
    pub fn new(data: &'a [Value]) -> Self {
        Self { data }
    }
}

impl<'a> BasicAdapter<'a> for AuctionHouseAdapter<'a> {
    type Vertex = Vertex<'a>;

    fn resolve_starting_vertices(
        &self,
        edge_name: &str,
        _parameters: &EdgeParameters,
    ) -> VertexIterator<'a, Self::Vertex> {
        match edge_name {
            "RecentlySoldItems" => {
                Box::new(self.data.iter().map(|v| v.into()).map(Vertex::SoldItem))
            }
            _ => unimplemented!("unexpected starting edge: {edge_name}"),
        }
    }

    fn resolve_property(
        &self,
        contexts: ContextIterator<'a, Self::Vertex>,
        type_name: &str,
        property_name: &str,
    ) -> ContextOutcomeIterator<'a, Self::Vertex, FieldValue> {
        match (type_name, property_name) {
            ("SoldItem", "unit_price") => resolve_property_with(contexts, |v| -> FieldValue {
                v.as_sold_item().unwrap().unit_price().unwrap()
            }),
            ("Item" | "SetCrystal", "name") => resolve_property_with(contexts, |v| -> FieldValue {
                v.as_sold_item().unwrap().item_name().unwrap()
            }),
            ("CrystalType", "name") => resolve_property_with(contexts, |v| -> FieldValue {
                FieldValue::String((*v.as_crystal_type().unwrap()).as_str().unwrap().to_owned())
            }),
            _ => unimplemented!("unexpected property: {type_name} {property_name}"),
        }
    }

    fn resolve_neighbors(
        &self,
        contexts: ContextIterator<'a, Self::Vertex>,
        type_name: &str,
        edge_name: &str,
        _parameters: &EdgeParameters,
    ) -> ContextOutcomeIterator<'a, Self::Vertex, VertexIterator<'a, Self::Vertex>> {
        match (type_name, edge_name) {
            ("SoldItem", "item") => resolve_neighbors_with(contexts, |vertex: &Self::Vertex| {
                Box::new(std::iter::once(vertex.clone()))
            }),
            ("SetCrystal", "crystal_type") => {
                resolve_neighbors_with(contexts, |vertex: &Self::Vertex| {
                    Box::new(
                        vertex
                            .as_sold_item()
                            .unwrap()
                            .crystal_types()
                            .unwrap()
                            .iter()
                            .map(Vertex::CrystalType),
                    )
                })
            }
            _ => unimplemented!("unexpected neighbor: {type_name} {edge_name}"),
        }
    }

    fn resolve_coercion(
        &self,
        contexts: ContextIterator<'a, Self::Vertex>,
        _type_name: &str,
        coerce_to_type: &str,
    ) -> ContextOutcomeIterator<'a, Self::Vertex, bool> {
        match coerce_to_type {
            "SetCrystal" => resolve_coercion_with(contexts, |vertex: &Self::Vertex| {
                vertex.as_sold_item().unwrap().item_type().unwrap() == "crystal"
            }),
            _ => unimplemented!("unexpected coercion to: {coerce_to_type}"),
        }
    }
}
