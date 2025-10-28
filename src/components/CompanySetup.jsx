import React, { useState } from 'react';
import { useCompany } from '../context/CompanyContext';

const CompanySetup = ({ onComplete }) => {
  const { createCompany, updateCustomFields } = useCompany();
  const [step, setStep] = useState(1);
  const [companyData, setCompanyData] = useState({
    name: '',
    description: '',
    settings: {
      product_type: 'custom',
      has_sizes: false,
      size_range: [],
      custom_fields: []
    }
  });
  const [customFields, setCustomFields] = useState([
    { field_name: 'reference', field_label: 'Referencia', field_type: 'text', is_required: true, display_order: 1 },
    { field_name: 'price_r', field_label: 'Precio Detal', field_type: 'number', is_required: true, display_order: 2 }
  ]);

  const productTypes = [
    { value: 'shoes', label: 'Calzado', fields: ['reference', 'color', 'size', 'price_r', 'price_w'] },
    { value: 'glasses', label: 'Gafas', fields: ['reference', 'color', 'brand', 'price_r', 'price_w'] },
    { value: 'clothing', label: 'Ropa', fields: ['reference', 'color', 'size', 'material', 'price_r', 'price_w'] },
    { value: 'custom', label: 'Personalizado', fields: [] }
  ];

  const fieldTypes = [
    { value: 'text', label: 'Texto' },
    { value: 'number', label: 'Número' },
    { value: 'select', label: 'Lista desplegable' },
    { value: 'color', label: 'Color' },
    { value: 'measurement', label: 'Medida/Talla' }
  ];

  const handleProductTypeChange = (type) => {
    if (type === 'shoes') {
      setCustomFields([
        { field_name: 'reference', field_label: 'Referencia', field_type: 'text', is_required: true, display_order: 1 },
        { field_name: 'color', field_label: 'Color', field_type: 'color', is_required: true, display_order: 2 },
        { field_name: 'size', field_label: 'Talla', field_type: 'measurement', is_required: true, display_order: 3, field_options: { values: ['34', '35', '36', '37', '38', '39', '40', '41'] } },
        { field_name: 'price_r', field_label: 'Precio Detal', field_type: 'number', is_required: true, display_order: 4 },
        { field_name: 'price_w', field_label: 'Precio Mayorista', field_type: 'number', is_required: true, display_order: 5 }
      ]);
      setCompanyData({
        ...companyData,
        settings: {
          ...companyData.settings,
          product_type: type,
          has_sizes: true,
          size_range: ['34', '35', '36', '37', '38', '39', '40', '41']
        }
      });
    } else if (type === 'glasses') {
      setCustomFields([
        { field_name: 'reference', field_label: 'Referencia', field_type: 'text', is_required: true, display_order: 1 },
        { field_name: 'color', field_label: 'Color', field_type: 'color', is_required: true, display_order: 2 },
        { field_name: 'brand', field_label: 'Marca', field_type: 'text', is_required: false, display_order: 3 },
        { field_name: 'price_r', field_label: 'Precio Detal', field_type: 'number', is_required: true, display_order: 4 },
        { field_name: 'price_w', field_label: 'Precio Mayorista', field_type: 'number', is_required: true, display_order: 5 }
      ]);
      setCompanyData({
        ...companyData,
        settings: {
          ...companyData.settings,
          product_type: type,
          has_sizes: false,
          size_range: []
        }
      });
    } else {
      setCompanyData({
        ...companyData,
        settings: {
          ...companyData.settings,
          product_type: type,
          has_sizes: false,
          size_range: []
        }
      });
    }
  };

  const addCustomField = () => {
    const newField = {
      field_name: `custom_${customFields.length + 1}`,
      field_label: 'Nuevo Campo',
      field_type: 'text',
      is_required: false,
      display_order: customFields.length + 1,
      field_options: {}
    };
    setCustomFields([...customFields, newField]);
  };

  const updateField = (index, updates) => {
    const updated = [...customFields];
    updated[index] = { ...updated[index], ...updates };
    setCustomFields(updated);
  };

  const removeField = (index) => {
    const updated = customFields.filter((_, i) => i !== index);
    setCustomFields(updated);
  };

  const handleSubmit = async () => {
    try {
      const company = await createCompany(companyData);
      await updateCustomFields(customFields);
      onComplete(company);
    } catch (error) {
      console.error('Error creating company:', error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-card rounded-lg shadow-default">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-theme mb-2">Configuración de Empresa</h2>
        <div className="flex space-x-2 mb-4">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                s <= step ? 'bg-theme text-white' : 'bg-gray-300 text-gray-600'
              }`}
            >
              {s}
            </div>
          ))}
        </div>
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold">Información de la Empresa</h3>
          <input
            type="text"
            placeholder="Nombre de la empresa"
            value={companyData.name}
            onChange={(e) => setCompanyData({ ...companyData, name: e.target.value })}
            className="w-full p-3 border border-default rounded"
          />
          <textarea
            placeholder="Descripción (opcional)"
            value={companyData.description}
            onChange={(e) => setCompanyData({ ...companyData, description: e.target.value })}
            className="w-full p-3 border border-default rounded h-20"
          />
          <button
            onClick={() => setStep(2)}
            disabled={!companyData.name}
            className="bg-theme text-white px-6 py-2 rounded hover:bg-theme-hover disabled:opacity-50"
          >
            Siguiente
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold">Tipo de Producto</h3>
          <div className="grid grid-cols-2 gap-4">
            {productTypes.map((type) => (
              <div
                key={type.value}
                onClick={() => handleProductTypeChange(type.value)}
                className={`p-4 border rounded cursor-pointer transition-colors ${
                  companyData.settings.product_type === type.value
                    ? 'border-theme bg-theme bg-opacity-10'
                    : 'border-gray-300 hover:border-theme'
                }`}
              >
                <h4 className="font-semibold">{type.label}</h4>
                <p className="text-sm text-gray-600">
                  {type.value === 'shoes' && 'Para zapatos, tenis, etc.'}
                  {type.value === 'glasses' && 'Para gafas, anteojos, etc.'}
                  {type.value === 'clothing' && 'Para ropa y textiles'}
                  {type.value === 'custom' && 'Configura tus propios campos'}
                </p>
              </div>
            ))}
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setStep(1)}
              className="bg-gray-300 text-gray-700 px-6 py-2 rounded hover:bg-gray-400"
            >
              Anterior
            </button>
            <button
              onClick={() => setStep(3)}
              className="bg-theme text-white px-6 py-2 rounded hover:bg-theme-hover"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold">Campos Personalizados</h3>
          <div className="space-y-3">
            {customFields.map((field, index) => (
              <div key={index} className="p-4 border border-gray-300 rounded">
                <div className="grid grid-cols-4 gap-3">
                  <input
                    type="text"
                    placeholder="Nombre del campo"
                    value={field.field_label}
                    onChange={(e) => updateField(index, { field_label: e.target.value })}
                    className="p-2 border border-default rounded"
                  />
                  <select
                    value={field.field_type}
                    onChange={(e) => updateField(index, { field_type: e.target.value })}
                    className="p-2 border border-default rounded"
                  >
                    {fieldTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={field.is_required}
                      onChange={(e) => updateField(index, { is_required: e.target.checked })}
                      className="mr-2"
                    />
                    Requerido
                  </label>
                  <button
                    onClick={() => removeField(index)}
                    className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={addCustomField}
            className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
          >
            Agregar Campo
          </button>
          <div className="flex space-x-2 mt-6">
            <button
              onClick={() => setStep(2)}
              className="bg-gray-300 text-gray-700 px-6 py-2 rounded hover:bg-gray-400"
            >
              Anterior
            </button>
            <button
              onClick={handleSubmit}
              className="bg-theme text-white px-6 py-2 rounded hover:bg-theme-hover"
            >
              Crear Empresa
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanySetup;
