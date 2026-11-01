import { useState } from 'react';
import api from '../../services/api';
import FormField, { inputClass } from '../../components/FormField.jsx';
import { DIET_TYPES, FOOD_CATEGORIES, STORAGE_CONDITIONS, apiError, label } from '../../utils/format';

function toLocalInputValue(date) {
  const offsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

const EMPTY_FORM = {
  foodType: '',
  foodCategory: 'cooked_meal',
  storageCondition: 'room_temp',
  dietType: 'veg',
  allergens: '',
  quantityKg: '',
};

function outcomeMessage({ donation, aiChecked, matchedNgoCount }) {
  if (!aiChecked) {
    return { tone: 'amber', text: 'Donation saved. The AI service is offline, so use "Retry" on it once it is back.' };
  }
  if (donation.freshness_status === 'spoiled') {
    return { tone: 'red', text: 'The freshness check flagged this food as possibly spoiled, so it was not offered to NGOs.' };
  }
  if (matchedNgoCount === 0) {
    return { tone: 'amber', text: 'Passed the freshness check, but no NGO in range accepts this food right now.' };
  }
  return { tone: 'emerald', text: `Passed the freshness check and was offered to ${matchedNgoCount} nearby NGO(s).` };
}

const TONES = {
  emerald: 'bg-emerald-50 text-emerald-800',
  amber: 'bg-amber-50 text-amber-800',
  red: 'bg-red-50 text-red-700',
};

export default function DonationForm({ onPosted }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [preparedAt, setPreparedAt] = useState(() => toLocalInputValue(new Date()));
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const [outcome, setOutcome] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function choosePhoto(file) {
    if (preview) URL.revokeObjectURL(preview);
    setPhoto(file);
    setPreview(file ? URL.createObjectURL(file) : null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setOutcome(null);
    setIsSubmitting(true);

    const body = new FormData();
    Object.entries(form).forEach(([key, value]) => {
      if (value !== '') body.append(key, value);
    });
    body.append('preparedAt', new Date(preparedAt).toISOString());
    body.append('image', photo);

    try {
      const { data } = await api.post('/donations', body);
      setOutcome(outcomeMessage(data));
      setForm(EMPTY_FORM);
      choosePhoto(null);
      e.target.reset();
      setPreparedAt(toLocalInputValue(new Date()));
      onPosted();
    } catch (err) {
      setError(apiError(err, 'Could not post the donation.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="rounded-lg border bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-800">Post surplus food</h2>
      <p className="mt-1 text-sm text-gray-500">
        A photo is checked for freshness, the safe window is worked out from the category and storage, and the
        donation is offered to the best nearby NGOs.
      </p>

      {error && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {outcome && <p className={`mt-4 rounded-md px-3 py-2 text-sm ${TONES[outcome.tone]}`}>{outcome.text}</p>}

      <form onSubmit={handleSubmit} className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <FormField label="What is it?" id="foodType">
            <input
              id="foodType"
              name="foodType"
              required
              minLength={2}
              maxLength={100}
              placeholder="e.g. Veg biryani and raita"
              value={form.foodType}
              onChange={handleChange}
              className={inputClass}
            />
          </FormField>
        </div>

        <FormField label="Category" id="foodCategory">
          <select id="foodCategory" name="foodCategory" value={form.foodCategory} onChange={handleChange} className={inputClass}>
            {FOOD_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {label(c)}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="How is it stored right now?" id="storageCondition">
          <select
            id="storageCondition"
            name="storageCondition"
            value={form.storageCondition}
            onChange={handleChange}
            className={inputClass}
          >
            {STORAGE_CONDITIONS.map((s) => (
              <option key={s} value={s}>
                {label(s)}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Diet" id="dietType">
          <select id="dietType" name="dietType" value={form.dietType} onChange={handleChange} className={inputClass}>
            {DIET_TYPES.map((d) => (
              <option key={d} value={d}>
                {label(d)}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Quantity (kg)" id="quantityKg">
          <input
            id="quantityKg"
            name="quantityKg"
            type="number"
            step="0.1"
            min="0.1"
            max="9999.99"
            required
            value={form.quantityKg}
            onChange={handleChange}
            className={inputClass}
          />
        </FormField>

        <FormField label="Prepared at" id="preparedAt">
          <input
            id="preparedAt"
            type="datetime-local"
            required
            max={toLocalInputValue(new Date())}
            value={preparedAt}
            onChange={(e) => setPreparedAt(e.target.value)}
            className={inputClass}
          />
        </FormField>

        <FormField label="Allergens (optional)" id="allergens">
          <input
            id="allergens"
            name="allergens"
            maxLength={255}
            placeholder="e.g. nuts, gluten"
            value={form.allergens}
            onChange={handleChange}
            className={inputClass}
          />
        </FormField>

        <div className="sm:col-span-2">
          <FormField label="Photo of the food" id="image">
            <input
              id="image"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              required
              onChange={(e) => choosePhoto(e.target.files[0] || null)}
              className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-md file:border-0 file:bg-gray-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-gray-700 hover:file:bg-gray-200"
            />
          </FormField>
          {preview && <img src={preview} alt="Selected food" className="mt-3 h-32 w-32 rounded-md object-cover" />}
        </div>

        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {isSubmitting ? 'Posting and checking freshness...' : 'Post donation'}
          </button>
        </div>
      </form>
    </div>
  );
}
