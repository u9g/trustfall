#![allow(dead_code)]

use serde_json::Value;
use trustfall::{
    provider::{
        resolve_coercion_with, resolve_neighbors_with, resolve_property_with, BasicAdapter,
        ContextIterator, ContextOutcomeIterator, EdgeParameters, VertexIterator,
    },
    FieldValue, Schema,
};

use crate::vertex::Vertex;

#[derive(Clone)]
pub struct AuctionHouseAdapter<'a> {
    data: &'a [Value],
    schema: &'a Schema,
}

impl<'a> AuctionHouseAdapter<'a> {
    pub fn new(data: &'a [Value], schema: &'a Schema) -> Self {
        Self { data, schema }
    }
}

macro_rules! impl_property_no_unwrap {
    ($contexts:ident, $conversion:ident, $attr:ident) => {
        resolve_property_with($contexts, |v| -> FieldValue {
            v.$conversion().unwrap().$attr().into()
        })
    };
}

macro_rules! impl_property {
    ($contexts:ident, $conversion:ident, $attr:ident) => {
        resolve_property_with($contexts, |v| -> FieldValue {
            v.$conversion().unwrap().$attr().unwrap().into()
        })
    };
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
        let lowest_common_denom = self.schema.lowest_common_denom(type_name, property_name);

        match (lowest_common_denom.as_str(), property_name) {
            ("CrystalType", "type") => resolve_property_with(contexts, |v| -> FieldValue {
                (*v.as_crystal_type().unwrap())
                    .as_str()
                    .unwrap()
                    .to_owned()
                    .into()
            }),
            ("CosmicCrate", "type") => impl_property!(contexts, as_sold_item, crate_type),
            ("CosmicCrate", "crate_purchased_from_store_by") => {
                impl_property!(contexts, as_sold_item, crate_purchaser)
            }
            ("MaskType", "type") => impl_property_no_unwrap!(contexts, as_mask_type, to_owned),
            ("BlackScroll", "success_percent") => {
                impl_property!(contexts, as_sold_item, blackscroll_success_chance)
            }
            ("Duration", units) => match units {
                "seconds" => impl_property_no_unwrap!(contexts, as_duration, num_seconds),
                "minutes" => impl_property_no_unwrap!(contexts, as_duration, num_minutes),
                "hours" => impl_property_no_unwrap!(contexts, as_duration, num_hours),
                _ => unimplemented!("unexpected property: Duration:{property_name}"),
            },
            ("SoldItem", prop) => match prop {
                "unit_price" => impl_property!(contexts, as_sold_item, unit_price),
                "unit_price_pretty" => impl_property!(contexts, as_sold_item, unit_price_pretty),
                "seller" => impl_property!(contexts, as_sold_item, seller),
                "buyer" => impl_property!(contexts, as_sold_item, buyer),
                "amount" => impl_property!(contexts, as_sold_item, amount),
                _ => unimplemented!("unexpected property: SoldItem:{property_name}"),
            },
            ("Item", prop) => match prop {
                "name" => impl_property!(contexts, as_sold_item, item_name),
                "item_type" => impl_property!(contexts, as_sold_item, item_type),
                "nbt" => resolve_property_with(contexts, |v| -> FieldValue {
                    v.as_sold_item()
                        .unwrap()
                        .value
                        .get("nbt")
                        .unwrap()
                        .to_string()
                        .into()
                }),
                _ => unimplemented!("unexpected property: Item:{property_name}"),
            },
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
            ("Mask", "type") => resolve_neighbors_with(contexts, |vertex: &Self::Vertex| {
                Box::new(
                    vertex
                        .as_sold_item()
                        .unwrap()
                        .mask_types()
                        .unwrap()
                        .split(',')
                        .map(str::to_string)
                        .map(FieldValue::String)
                        .map(Vertex::MaskType),
                )
            }),
            ("ExecTimeExtender", "duration") => {
                resolve_neighbors_with(contexts, |vertex: &Self::Vertex| {
                    Box::new(
                        std::iter::once(
                            vertex
                                .as_sold_item()
                                .unwrap()
                                .exec_time_extender_duration()
                                .unwrap(),
                        )
                        .map(Vertex::Duration),
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
            "CosmicCrate" => resolve_coercion_with(contexts, |vertex: &Self::Vertex| {
                vertex.as_sold_item().unwrap().item_type().unwrap() == "crate"
            }),
            "Mask" => resolve_coercion_with(contexts, |vertex: &Self::Vertex| {
                vertex.as_sold_item().unwrap().item_type().unwrap() == "mask"
            }),
            "BlackScroll" => resolve_coercion_with(contexts, |vertex: &Self::Vertex| {
                vertex.as_sold_item().unwrap().item_type().unwrap() == "blackscroll"
            }),
            "ExecTimeExtender" => resolve_coercion_with(contexts, |vertex: &Self::Vertex| {
                vertex.as_sold_item().unwrap().item_type().unwrap() == "exectimeextender"
            }),
            _ => unimplemented!("unexpected coercion to: {coerce_to_type}"),
        }
    }
}
