use serde_json::Value;
use trustfall::{provider::TrustfallEnumVertex, FieldValue};

#[derive(Debug, Clone, TrustfallEnumVertex)]
pub enum Vertex<'a> {
    SoldItem(SoldItem<'a>),
    CrystalType(&'a Value),
}

#[derive(Debug, Clone)]
pub struct SoldItem<'a> {
    value: &'a Value,
}

impl<'a> SoldItem<'a> {
    pub fn crystal_types(&self) -> Option<&'a Vec<Value>> {
        Some(
            self.value
                .get("nbt")?
                .get("joe")?
                .get("data")?
                .get("types")?
                .as_array()?, // .iter()
                              // .map(Vertex::CrystalType),
        )
    }

    pub fn item_type(&self) -> Option<&str> {
        Some(self.value.get("nbt")?.get("_x")?.as_str()?)
    }

    pub fn item_name(&self) -> Option<FieldValue> {
        Some(FieldValue::String(
            self.value.get("name")?.as_str()?.to_string(),
        ))
    }

    pub fn unit_price(&self) -> Option<FieldValue> {
        Some(FieldValue::Float64(self.value.get("price_per")?.as_f64()?))
    }
}

impl<'a> From<&'a Value> for SoldItem<'a> {
    fn from(value: &'a Value) -> Self {
        Self { value }
    }
}
