import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';
import { RefEntityType } from './RefEntityType';
export { RefEntityType };

// Base attributes shared by most reference tables
const baseAttributes = {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.TEXT,
    allowNull: false,
    unique: true,
  },
  display_order: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
};

const baseOptions = (tableName: string) => ({
  sequelize,
  tableName,
  timestamps: false, // Reference tables usually don't need strict timestamps, or we can add them if needed
});

// --- Models ---

export class RefNatureOfBusiness extends Model { }
RefNatureOfBusiness.init(baseAttributes, baseOptions('ref_nature_of_business'));

export class RefEndUseMarket extends Model { }
RefEndUseMarket.init(baseAttributes, baseOptions('ref_end_use_markets'));

export class RefLicenseType extends Model { }
RefLicenseType.init(baseAttributes, baseOptions('ref_license_types'));

export class RefCountry extends Model { }
RefCountry.init({
  ...baseAttributes,
  code: { type: DataTypes.TEXT, allowNull: false, unique: true },
  flag: DataTypes.TEXT,
  phone_code: DataTypes.TEXT,
}, baseOptions('ref_countries'));

export class RefVendorCategory extends Model { }
RefVendorCategory.init({
  ...baseAttributes,
  is_controlled: { type: DataTypes.BOOLEAN, defaultValue: false },
  control_note: DataTypes.TEXT,
}, baseOptions('ref_vendor_categories'));

export class RefCurrency extends Model { }
RefCurrency.init({
  ...baseAttributes,
  code: { type: DataTypes.TEXT, allowNull: false, unique: true },
  symbol: DataTypes.TEXT,
  exchange_rate: {
    type: DataTypes.DECIMAL(18, 8),
    allowNull: false,
    defaultValue: 1.0,
    comment: 'Exchange rate: 1 AED = X of this currency'
  },
  rate_updated_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Timestamp of last rate update from external API'
  },
  is_base: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'TRUE for AED (base currency), FALSE for all others'
  },
}, baseOptions('ref_currencies'));

export class RefPaymentMethod extends Model { }
RefPaymentMethod.init({
  ...baseAttributes,
  icon: DataTypes.TEXT,
}, baseOptions('ref_payment_methods'));

export class RefFinancialInstitution extends Model { }
RefFinancialInstitution.init({
  ...baseAttributes,
  // name is in baseAttributes
  country_code: { type: DataTypes.TEXT, allowNull: false },
  swift_code: DataTypes.TEXT,
}, baseOptions('ref_financial_institutions'));

export class RefProofType extends Model { }
RefProofType.init(baseAttributes, baseOptions('ref_proof_types'));

export class RefVerificationMethod extends Model { }
RefVerificationMethod.init({
  ...baseAttributes,
  description: DataTypes.TEXT,
  is_available: { type: DataTypes.BOOLEAN, defaultValue: true },
}, baseOptions('ref_verification_methods'));

export class RefProductSize extends Model { }
RefProductSize.init(baseAttributes, baseOptions('ref_product_sizes'));



export class RefProductFeature extends Model { }
RefProductFeature.init(baseAttributes, baseOptions('ref_product_features'));

export class RefProductPerformance extends Model { }
RefProductPerformance.init(baseAttributes, baseOptions('ref_product_performance'));

export class RefProductThickness extends Model { }
RefProductThickness.init(baseAttributes, baseOptions('ref_product_thickness'));

export class RefProductMaterial extends Model { }
RefProductMaterial.init(baseAttributes, baseOptions('ref_product_materials'));

export class RefDriveType extends Model { }
RefDriveType.init(baseAttributes, baseOptions('ref_drive_types'));

export class RefDimensionUnit extends Model { }
RefDimensionUnit.init({
  ...baseAttributes,
  abbreviation: { type: DataTypes.TEXT, allowNull: false },
}, baseOptions('ref_dimension_units'));

export class RefWeightUnit extends Model { }
RefWeightUnit.init({
  ...baseAttributes,
  abbreviation: { type: DataTypes.TEXT, allowNull: false },
}, baseOptions('ref_weight_units'));

export class RefControlledItemType extends Model { }
RefControlledItemType.init({
  ...baseAttributes,
  description: DataTypes.TEXT,
}, baseOptions('ref_controlled_item_types'));

export class RefPricingTerm extends Model { }
RefPricingTerm.init({
  ...baseAttributes,
  code: { type: DataTypes.TEXT, allowNull: false, unique: true },
  description: DataTypes.TEXT,
}, baseOptions('ref_pricing_terms'));

export class RefManufacturingSource extends Model { }
RefManufacturingSource.init(baseAttributes, baseOptions('ref_manufacturing_sources'));

export class RefBuyerType extends Model { }
RefBuyerType.init(baseAttributes, baseOptions('ref_buyer_types'));

export class RefProcurementPurpose extends Model { }
RefProcurementPurpose.init(baseAttributes, baseOptions('ref_procurement_purposes'));

export class RefEndUserType extends Model { }
RefEndUserType.init(baseAttributes, baseOptions('ref_end_user_types'));

// Map for convenient access by key
export const ReferenceModels: Record<string, any> = {
  nature_of_business: RefNatureOfBusiness,
  end_use_markets: RefEndUseMarket,
  license_types: RefLicenseType,
  countries: RefCountry,
  vendor_categories: RefVendorCategory,
  currencies: RefCurrency,
  payment_methods: RefPaymentMethod,
  financial_institutions: RefFinancialInstitution,
  proof_types: RefProofType,
  verification_methods: RefVerificationMethod,
  // product_sizes: RefProductSize,
  // product_colors: RefProductColor,
  product_features: RefProductFeature,
  product_performance: RefProductPerformance,
  product_thickness: RefProductThickness,
  product_materials: RefProductMaterial,
  // drive_types: RefDriveType,
  // dimension_units: RefDimensionUnit,
  // weight_units: RefWeightUnit,
  controlled_item_types: RefControlledItemType,
  // pricing_terms: RefPricingTerm,
  manufacturing_sources: RefManufacturingSource,
  type_of_buyer: RefBuyerType,
  procurement_purpose: RefProcurementPurpose,
  end_user_type: RefEndUserType,
  entity_type: RefEntityType,
};
