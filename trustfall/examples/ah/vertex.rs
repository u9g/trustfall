use chrono::Duration;
use serde_json::Value;
use trustfall::{provider::TrustfallEnumVertex, FieldValue};

#[derive(Debug, Clone, TrustfallEnumVertex)]
pub enum Vertex<'a> {
    SoldItem(SoldItem<'a>),
    CrystalType(&'a Value),
    MaskType(FieldValue),
    Duration(Duration), // i64 = seconds
}

#[derive(Debug, Clone)]
pub struct SoldItem<'a> {
    pub value: &'a Value,
}

impl<'a> SoldItem<'a> {
    pub fn crystal_types(&self) -> Option<&'a Vec<Value>> {
        Some(
            self.value
                .get("nbt")?
                .get("joe")?
                .get("data")?
                .get("types")?
                .as_array()?,
        )
    }

    pub fn mask_types(&self) -> Option<&'a str> {
        Some(
            self.value
                .get("nbt")?
                .get("joe")?
                .get("data")?
                .get("types")?
                .as_str()?,
        )
    }

    pub fn item_type(&self) -> Option<&str> {
        Some(self.value.get("nbt")?.get("_x")?.as_str()?)
    }

    pub fn exec_time_extender_duration(&self) -> Option<Duration> {
        Some(Duration::seconds(
            self.value.get("nbt")?.get("exectimeextender")?.as_i64()?,
        ))
    }

    pub fn blackscroll_success_chance(&self) -> Option<FieldValue> {
        Some(FieldValue::Int64(
            (self
                .value
                .get("nbt")?
                .get("joeBlackScroll-chance")?
                .as_f64()?
                * 100f64)
                .round() as i64,
        ))
    }

    pub fn item_name(&self) -> Option<FieldValue> {
        Some(self.value.get("name")?.as_str()?.to_string().into())
    }

    fn unit_price_as_num(&self) -> Option<i64> {
        Some(self.value.get("price_per")?.as_i64()?)
    }

    pub fn unit_price(&self) -> Option<FieldValue> {
        Some(FieldValue::Int64(self.unit_price_as_num()?))
    }

    pub fn unit_price_pretty(&self) -> Option<FieldValue> {
        let num = self.unit_price_as_num()?;
        let mut frac = num;
        let mut suffix = String::from("");
        if num >= 1_000_000_000 {
            suffix = String::from("b");
            frac /= 1_000_000_000;
        } else if num >= 1_000_000 {
            suffix = String::from("m");
            frac /= 1_000_000;
        } else if num >= 1_000 {
            suffix = String::from("k");
            frac /= 1_000;
        }
        Some(FieldValue::String(format!("{}{}", frac, suffix)))
    }

    pub fn seller(&self) -> Option<FieldValue> {
        Some(self.value.get("seller")?.as_str()?.to_string().into())
    }

    pub fn buyer(&self) -> Option<FieldValue> {
        Some(self.value.get("buyer")?.as_str()?.to_string().into())
    }

    pub fn amount(&self) -> Option<FieldValue> {
        Some(self.value.get("amount")?.as_i64().into())
    }

    pub fn crate_type(&self) -> Option<FieldValue> {
        Some(
            self.value
                .get("nbt")?
                .get("joeCrate")?
                .as_str()?
                .to_string()
                .into(),
        )
    }

    pub fn crate_purchaser(&self) -> Option<FieldValue> {
        Some(
            self.value
                .get("nbt")?
                .get("joeCrate-purchaser")?
                .as_str()?
                .to_string()
                .into(),
        )
    }
}

impl<'a> From<&'a Value> for SoldItem<'a> {
    fn from(value: &'a Value) -> Self {
        Self { value }
    }
}
