/* eslint-disable */
// Seed a library of condition-specific meal plans + a recipe pool for the
// coach (Rawan). Recipes are published so they show in the recipe builder
// AND the assignable pickers; plans are TEMPLATES (is_active=false,
// client_id=null) authored by Rawan so they appear in the walk-in "pick
// from library" dropdown and (once the builder load feature ships) the
// meal-plan builder. Idempotent-ish: it tags seeded rows and deletes prior
// seeds (by the marker) before re-inserting, so re-running is safe.
//
// Run:  node scripts/seed_condition_plans.cjs
const fs = require('fs')
const path = require('path')

const env = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8')
const get = (k) => {
  const m = env.match(new RegExp('^' + k + '=(.*)$', 'm'))
  return m ? m[1].trim().replace(/^["']|["']$/g, '') : null
}
const URL = get('NEXT_PUBLIC_SUPABASE_URL')
const KEY = get('SUPABASE_SERVICE_ROLE_KEY')
const RAWAN = '3c6c2147-21b4-429d-98d4-877f5db56cd7' // Coach Rawan Othman
const MARKER = '[seed:condition-library]' // marks seeded plans for safe re-run

if (!URL || !KEY) { console.error('Missing SUPABASE url/service key'); process.exit(1) }

const H = { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' }
const rest = (p, opts = {}) => fetch(URL + '/rest/v1/' + p, { ...opts, headers: { ...H, ...(opts.headers || {}) } })
let _id = 0
const uid = (pfx) => `${pfx}-${Date.now()}-${_id++}`
const ing = (name, grams, kcal, p, c, f) => ({ id: uid('ing'), name, grams, calories: kcal, protein: p, carbs: c, fat: f })
const step = (body) => ({ id: uid('st'), body })

// ── Recipe pool ────────────────────────────────────────────────────────
// for: condition keys this recipe suits ('any' = generally healthy).
const R = [
  // breakfasts
  { key: 'eggwhite_omelette', title: 'Veggie Egg-White Omelette', cat: 'breakfast', tags: ['highProtein','glutenFree'], kcal: 240, p: 24, c: 8, f: 12, prep: 5, cook: 8, serv: 1,
    ing: [ing('Egg whites', 200, 100, 22, 2, 0), ing('Spinach', 60, 14, 2, 2, 0), ing('Bell pepper', 50, 15, 1, 3, 0), ing('Olive oil', 8, 70, 0, 0, 8)],
    steps: ['Whisk egg whites with a pinch of pepper.', 'Sauté spinach and pepper in olive oil.', 'Pour eggs over, fold and cook through.'], for: ['weight_loss','diabetes','heart','cholesterol','glp1','pcos','prediabetes','low_carb','muscle_gain','any'] },
  { key: 'greek_yogurt_bowl', title: 'Greek Yogurt & Berry Bowl', cat: 'breakfast', tags: ['highProtein','vegetarian'], kcal: 260, p: 22, c: 28, f: 6, prep: 5, cook: 0, serv: 1,
    ing: [ing('Greek yogurt 0%', 200, 120, 20, 8, 0), ing('Mixed berries', 100, 50, 1, 12, 0), ing('Chia seeds', 12, 60, 2, 5, 4), ing('Honey', 10, 30, 0, 8, 0)],
    steps: ['Spoon yogurt into a bowl.', 'Top with berries and chia.', 'Drizzle a little honey.'], for: ['weight_loss','gut','pcos','glp1','menopause','any'] },
  { key: 'overnight_oats', title: 'Overnight Oats with Chia', cat: 'breakfast', tags: ['vegetarian'], kcal: 320, p: 12, c: 48, f: 9, prep: 5, cook: 0, serv: 1,
    ing: [ing('Rolled oats', 50, 190, 7, 33, 3), ing('Low-fat milk', 200, 90, 7, 10, 2), ing('Chia seeds', 12, 60, 2, 5, 4)],
    steps: ['Combine oats, milk and chia in a jar.', 'Refrigerate overnight.', 'Top with fruit before serving.'], for: ['cholesterol','heart','diabetes','fatty_liver','prediabetes','senior','any'] },
  { key: 'steelcut_walnut', title: 'Steel-Cut Oatmeal with Walnuts', cat: 'breakfast', tags: ['vegetarian'], kcal: 330, p: 11, c: 45, f: 12, prep: 5, cook: 20, serv: 1,
    ing: [ing('Steel-cut oats', 45, 170, 6, 30, 3), ing('Walnuts', 15, 100, 2, 2, 10), ing('Cinnamon', 2, 5, 0, 1, 0), ing('Low-fat milk', 150, 65, 5, 7, 2)],
    steps: ['Simmer oats in milk until creamy.', 'Stir in cinnamon.', 'Top with walnuts.'], for: ['cholesterol','heart','anti_inflammatory','any'] },
  { key: 'tofu_scramble', title: 'Tofu Veggie Scramble', cat: 'breakfast', tags: ['vegetarian','highProtein'], kcal: 250, p: 18, c: 10, f: 15, prep: 8, cook: 8, serv: 1,
    ing: [ing('Firm tofu', 150, 170, 16, 4, 10), ing('Turmeric', 2, 5, 0, 1, 0), ing('Mushrooms', 60, 15, 2, 2, 0), ing('Olive oil', 7, 60, 0, 0, 7)],
    steps: ['Crumble tofu; season with turmeric.', 'Sauté mushrooms in oil.', 'Add tofu and cook 5 min.'], for: ['vegetarian','heart','kidney','any'] },
  { key: 'lowsodium_frittata', title: 'Low-Sodium Veggie Frittata', cat: 'breakfast', tags: ['highProtein','glutenFree'], kcal: 280, p: 20, c: 9, f: 18, prep: 8, cook: 15, serv: 1,
    ing: [ing('Eggs', 100, 140, 12, 1, 10), ing('Zucchini', 80, 16, 1, 3, 0), ing('Tomato', 60, 11, 1, 2, 0), ing('Olive oil', 8, 70, 0, 0, 8)],
    steps: ['Whisk eggs (no added salt).', 'Add veg, pour into pan.', 'Bake 12–15 min.'], for: ['hypertension','heart','kidney','any'] },
  { key: 'protein_smoothie', title: 'Spinach-Berry Protein Smoothie', cat: 'breakfast', tags: ['highProtein'], kcal: 230, p: 25, c: 22, f: 4, prep: 5, cook: 0, serv: 1,
    ing: [ing('Whey/plant protein', 30, 110, 24, 3, 1), ing('Spinach', 40, 9, 1, 1, 0), ing('Frozen berries', 100, 50, 1, 12, 0), ing('Water', 200, 0, 0, 0, 0)],
    steps: ['Add everything to a blender.', 'Blend until smooth.'], for: ['glp1','weight_loss','gut','post_bariatric','muscle_gain','any'] },
  { key: 'avocado_toast', title: 'Avocado Toast on Whole Grain', cat: 'breakfast', tags: ['vegetarian'], kcal: 300, p: 9, c: 30, f: 16, prep: 6, cook: 2, serv: 1,
    ing: [ing('Whole-grain bread', 60, 150, 6, 26, 2), ing('Avocado', 70, 110, 1, 4, 10), ing('Lemon', 5, 1, 0, 0, 0)],
    steps: ['Toast bread.', 'Mash avocado with lemon.', 'Spread and season with pepper.'], for: ['heart','cholesterol','mediterranean','any'] },

  // lunches
  { key: 'chicken_quinoa', title: 'Grilled Chicken & Quinoa Salad', cat: 'lunch', tags: ['highProtein','glutenFree'], kcal: 420, p: 38, c: 35, f: 12, prep: 10, cook: 15, serv: 1,
    ing: [ing('Chicken breast', 130, 215, 40, 0, 5), ing('Cooked quinoa', 120, 160, 6, 28, 3), ing('Mixed greens', 60, 15, 1, 3, 0), ing('Olive oil', 6, 50, 0, 0, 6)],
    steps: ['Grill seasoned chicken.', 'Toss quinoa and greens with oil.', 'Slice chicken over the top.'], for: ['weight_loss','muscle_gain','diabetes','glp1','prediabetes','endurance','any'] },
  { key: 'lentil_soup', title: 'Lentil & Vegetable Soup', cat: 'lunch', tags: ['vegetarian'], kcal: 320, p: 18, c: 45, f: 6, prep: 10, cook: 30, serv: 1,
    ing: [ing('Lentils (cooked)', 180, 230, 18, 39, 1), ing('Carrot', 60, 25, 1, 6, 0), ing('Onion', 40, 16, 0, 4, 0), ing('Olive oil', 6, 50, 0, 0, 6)],
    steps: ['Sauté onion and carrot.', 'Add lentils and water; simmer 25 min.', 'Blend lightly if desired.'], for: ['cholesterol','heart','vegetarian','gut','fatty_liver','any'] },
  { key: 'baked_salmon_greens', title: 'Baked Salmon with Greens', cat: 'lunch', tags: ['highProtein','glutenFree'], kcal: 410, p: 34, c: 10, f: 26, prep: 8, cook: 18, serv: 1,
    ing: [ing('Salmon fillet', 140, 290, 34, 0, 18), ing('Kale/greens', 80, 35, 3, 5, 0), ing('Olive oil', 8, 70, 0, 0, 8)],
    steps: ['Bake salmon 15 min at 200°C.', 'Wilt greens in oil.', 'Serve together with lemon.'], for: ['heart','cholesterol','anti_inflammatory','menopause','glp1','any'] },
  { key: 'chickpea_bowl', title: 'Mediterranean Chickpea Bowl', cat: 'lunch', tags: ['vegetarian'], kcal: 400, p: 16, c: 50, f: 14, prep: 10, cook: 0, serv: 1,
    ing: [ing('Chickpeas', 160, 270, 14, 45, 4), ing('Cucumber', 70, 11, 0, 2, 0), ing('Tomato', 70, 13, 1, 3, 0), ing('Olive oil', 8, 70, 0, 0, 8)],
    steps: ['Combine chickpeas, cucumber, tomato.', 'Dress with olive oil and lemon.', 'Season with herbs.'], for: ['heart','vegetarian','mediterranean','diabetes','any'] },
  { key: 'turkey_wrap', title: 'Turkey & Veggie Wrap', cat: 'lunch', tags: ['highProtein'], kcal: 360, p: 30, c: 34, f: 10, prep: 8, cook: 0, serv: 1,
    ing: [ing('Turkey breast', 110, 130, 26, 0, 2), ing('Whole-grain wrap', 60, 180, 6, 30, 4), ing('Lettuce & tomato', 70, 18, 1, 3, 0)],
    steps: ['Lay turkey and veg on the wrap.', 'Roll tightly.', 'Slice in half.'], for: ['weight_loss','muscle_gain','glp1','any'] },
  { key: 'tuna_salad', title: 'Tuna Salad (no mayo)', cat: 'lunch', tags: ['highProtein','glutenFree'], kcal: 300, p: 32, c: 8, f: 14, prep: 8, cook: 0, serv: 1,
    ing: [ing('Canned tuna (water)', 120, 130, 28, 0, 2), ing('Mixed greens', 80, 20, 2, 4, 0), ing('Olive oil', 10, 90, 0, 0, 10)],
    steps: ['Drain tuna.', 'Toss with greens and oil.', 'Add lemon and pepper.'], for: ['low_carb','weight_loss','glp1','prediabetes','any'] },
  { key: 'rice_beans', title: 'Brown Rice & Black Bean Bowl', cat: 'lunch', tags: ['vegetarian'], kcal: 420, p: 16, c: 70, f: 8, prep: 8, cook: 20, serv: 1,
    ing: [ing('Brown rice (cooked)', 150, 165, 4, 34, 1), ing('Black beans', 130, 150, 9, 27, 1), ing('Salsa', 50, 15, 1, 3, 0)],
    steps: ['Warm rice and beans.', 'Top with salsa.', 'Add lime and cilantro.'], for: ['diabetes','vegetarian','fatty_liver','any'] },
  { key: 'lowsodium_chicken_veg', title: 'Low-Sodium Grilled Chicken & Veg', cat: 'lunch', tags: ['highProtein','glutenFree'], kcal: 380, p: 38, c: 18, f: 16, prep: 10, cook: 15, serv: 1,
    ing: [ing('Chicken breast', 140, 230, 43, 0, 6), ing('Mixed vegetables', 150, 60, 3, 12, 0), ing('Olive oil', 8, 70, 0, 0, 8)],
    steps: ['Grill chicken with herbs (no salt).', 'Roast vegetables in oil.', 'Plate together.'], for: ['hypertension','heart','kidney','weight_loss','any'] },
  { key: 'broth_bowl', title: 'Bone Broth & Soft Veggie Bowl', cat: 'lunch', tags: ['glutenFree'], kcal: 260, p: 20, c: 20, f: 8, prep: 8, cook: 20, serv: 1,
    ing: [ing('Bone/veg broth', 300, 60, 8, 4, 2), ing('Soft carrots', 80, 33, 1, 8, 0), ing('Shredded chicken', 70, 115, 21, 0, 3)],
    steps: ['Heat broth.', 'Add soft-cooked carrots and chicken.', 'Simmer 10 min.'], for: ['gut','stomach','ibs','post_bariatric','senior','any'] },

  // dinners
  { key: 'baked_cod_veg', title: 'Baked Cod with Steamed Vegetables', cat: 'dinner', tags: ['highProtein','glutenFree'], kcal: 320, p: 34, c: 16, f: 10, prep: 8, cook: 18, serv: 1,
    ing: [ing('Cod fillet', 160, 150, 33, 0, 2), ing('Broccoli', 120, 42, 4, 8, 0), ing('Olive oil', 9, 80, 0, 0, 9)],
    steps: ['Bake cod 15 min.', 'Steam broccoli.', 'Drizzle oil and lemon.'], for: ['weight_loss','heart','stomach','glp1','kidney','any'] },
  { key: 'tofu_broccoli', title: 'Stir-Fried Tofu & Broccoli', cat: 'dinner', tags: ['vegetarian','highProtein'], kcal: 350, p: 22, c: 24, f: 16, prep: 10, cook: 12, serv: 1,
    ing: [ing('Firm tofu', 160, 180, 17, 4, 11), ing('Broccoli', 130, 46, 4, 9, 0), ing('Low-sodium soy', 10, 8, 1, 1, 0), ing('Sesame oil', 8, 70, 0, 0, 8)],
    steps: ['Sear tofu cubes.', 'Add broccoli and soy.', 'Stir-fry 6 min.'], for: ['vegetarian','diabetes','prediabetes','any'] },
  { key: 'chicken_sweetpotato', title: 'Grilled Chicken & Sweet Potato', cat: 'dinner', tags: ['highProtein','glutenFree'], kcal: 440, p: 40, c: 40, f: 12, prep: 10, cook: 25, serv: 1,
    ing: [ing('Chicken breast', 150, 245, 46, 0, 6), ing('Sweet potato', 180, 155, 3, 36, 0), ing('Olive oil', 8, 70, 0, 0, 8)],
    steps: ['Roast sweet potato.', 'Grill chicken.', 'Serve with greens.'], for: ['muscle_gain','weight_loss','endurance','any'] },
  { key: 'barley_stew', title: 'Vegetable & Barley Stew', cat: 'dinner', tags: ['vegetarian'], kcal: 340, p: 11, c: 60, f: 6, prep: 10, cook: 35, serv: 1,
    ing: [ing('Pearl barley', 60, 210, 6, 44, 1), ing('Mixed vegetables', 150, 70, 3, 14, 0), ing('Olive oil', 7, 60, 0, 0, 7)],
    steps: ['Simmer barley with veg and broth.', 'Cook 30 min until tender.', 'Season with herbs.'], for: ['cholesterol','heart','gut','fatty_liver','any'] },
  { key: 'beef_skillet', title: 'Lean Beef & Veggie Skillet', cat: 'dinner', tags: ['highProtein','glutenFree'], kcal: 400, p: 36, c: 18, f: 20, prep: 10, cook: 15, serv: 1,
    ing: [ing('Lean beef', 130, 250, 32, 0, 13), ing('Peppers & onion', 130, 45, 2, 9, 0), ing('Olive oil', 8, 70, 0, 0, 8)],
    steps: ['Brown beef.', 'Add peppers and onion.', 'Cook through.'], for: ['anemia','muscle_gain','thyroid','any'] },
  { key: 'salmon_asparagus', title: 'Roasted Salmon & Asparagus', cat: 'dinner', tags: ['highProtein','glutenFree'], kcal: 420, p: 34, c: 10, f: 27, prep: 8, cook: 18, serv: 1,
    ing: [ing('Salmon fillet', 150, 310, 36, 0, 19), ing('Asparagus', 120, 25, 3, 4, 0), ing('Olive oil', 8, 70, 0, 0, 8)],
    steps: ['Roast salmon and asparagus 15 min.', 'Finish with lemon.'], for: ['heart','anti_inflammatory','glp1','menopause','any'] },
  { key: 'zoodle_turkey', title: 'Zucchini Noodles with Turkey', cat: 'dinner', tags: ['highProtein','glutenFree'], kcal: 320, p: 32, c: 14, f: 14, prep: 10, cook: 12, serv: 1,
    ing: [ing('Ground turkey', 130, 200, 27, 0, 10), ing('Zucchini noodles', 200, 34, 2, 6, 0), ing('Tomato sauce', 80, 30, 1, 6, 0)],
    steps: ['Brown turkey.', 'Add sauce; simmer.', 'Toss with zucchini noodles.'], for: ['low_carb','weight_loss','glp1','prediabetes','any'] },
  { key: 'lentil_dahl', title: 'Lentil Dahl with Spinach', cat: 'dinner', tags: ['vegetarian'], kcal: 350, p: 19, c: 50, f: 8, prep: 10, cook: 30, serv: 1,
    ing: [ing('Red lentils', 80, 280, 20, 48, 1), ing('Spinach', 80, 18, 2, 3, 0), ing('Olive oil', 7, 60, 0, 0, 7)],
    steps: ['Simmer lentils with spices.', 'Stir in spinach.', 'Cook until creamy.'], for: ['vegetarian','anemia','gut','any'] },

  // snacks
  { key: 'apple_almond', title: 'Apple & Almond Butter', cat: 'snack', tags: ['vegetarian'], kcal: 200, p: 5, c: 25, f: 10, prep: 3, cook: 0, serv: 1,
    ing: [ing('Apple', 150, 80, 0, 21, 0), ing('Almond butter', 16, 100, 4, 3, 9)],
    steps: ['Slice apple.', 'Serve with almond butter.'], for: ['heart','diabetes','prediabetes','any'] },
  { key: 'cottage_cucumber', title: 'Cottage Cheese & Cucumber', cat: 'snack', tags: ['highProtein','vegetarian'], kcal: 150, p: 18, c: 8, f: 4, prep: 4, cook: 0, serv: 1,
    ing: [ing('Low-fat cottage cheese', 150, 120, 16, 6, 3), ing('Cucumber', 80, 13, 1, 3, 0)],
    steps: ['Spoon cottage cheese.', 'Top with sliced cucumber and pepper.'], for: ['weight_loss','muscle_gain','glp1','post_bariatric','any'] },
  { key: 'mixed_nuts', title: 'Handful of Mixed Nuts', cat: 'snack', tags: ['vegetarian'], kcal: 180, p: 6, c: 6, f: 16, prep: 1, cook: 0, serv: 1,
    ing: [ing('Mixed unsalted nuts', 28, 180, 6, 6, 16)],
    steps: ['Portion 28 g of unsalted nuts.'], for: ['heart','cholesterol','menopause','any'] },
  { key: 'carrot_hummus', title: 'Carrot Sticks & Hummus', cat: 'snack', tags: ['vegetarian'], kcal: 150, p: 5, c: 18, f: 7, prep: 4, cook: 0, serv: 1,
    ing: [ing('Carrot', 100, 41, 1, 10, 0), ing('Hummus', 50, 110, 4, 8, 7)],
    steps: ['Cut carrots into sticks.', 'Serve with hummus.'], for: ['gut','weight_loss','vegetarian','any'] },
]

// ── Condition plans ──────────────────────────────────────────────────────
const PLANS = [
  { key: 'weight_loss', title: 'Weight Loss – 10 kg (≈1500 kcal)', desc: 'Calorie-controlled, high-protein plan to support steady fat loss of ~0.5 kg/week.' },
  { key: 'cholesterol', title: 'High Cholesterol – Low Saturated Fat', desc: 'Soluble-fibre and unsaturated-fat focus to help lower LDL cholesterol.' },
  { key: 'diabetes', title: 'Type 2 Diabetes – Low Glycaemic', desc: 'Balanced low-GI meals to steady blood sugar across the day.' },
  { key: 'heart', title: 'Heart Health – DASH Style', desc: 'Vegetable-forward, lean-protein, healthy-fat meals for cardiovascular health.' },
  { key: 'stomach', title: 'Stomach / GI-Friendly – Gentle', desc: 'Easy-to-digest, low-irritant meals for sensitive stomachs.' },
  { key: 'hypertension', title: 'Hypertension – Low Sodium', desc: 'Low-sodium, potassium-rich meals to support healthy blood pressure.' },
  { key: 'pcos', title: 'PCOS – Insulin-Friendly', desc: 'Lower-GI, higher-protein meals to support insulin sensitivity.' },
  { key: 'anti_inflammatory', title: 'Anti-Inflammatory', desc: 'Omega-3 and antioxidant-rich meals to reduce inflammation.' },
  { key: 'ibs', title: 'IBS-Friendly – Gentle Fibre', desc: 'Lower-irritant, gut-gentle meals for IBS symptom management.' },
  { key: 'fatty_liver', title: 'Fatty Liver – Low Sugar', desc: 'Low added-sugar, high-fibre meals to support liver health.' },
  { key: 'muscle_gain', title: 'High-Protein Muscle Gain', desc: 'Higher-calorie, protein-dense meals to support lean muscle gain.' },
  { key: 'vegetarian', title: 'Vegetarian Weight Loss', desc: 'Plant-based, protein-conscious meals for healthy weight loss.' },
  { key: 'mediterranean', title: 'Mediterranean Balanced', desc: 'Classic Mediterranean pattern: veg, legumes, fish, olive oil.' },
  { key: 'low_carb', title: 'Low-Carb', desc: 'Reduced-carbohydrate, protein- and veg-forward meals.' },
  { key: 'anemia', title: 'Iron-Boost (Anaemia)', desc: 'Iron-rich meals with vitamin-C pairings to support iron levels.' },
  { key: 'thyroid', title: 'Thyroid Support', desc: 'Balanced, nutrient-dense meals supporting thyroid health.' },
  { key: 'kidney', title: 'Kidney-Friendly – Moderate Protein', desc: 'Moderate-protein, lower-sodium meals for kidney support.' },
  { key: 'prediabetes', title: 'Prediabetes Reversal', desc: 'Low-GI, fibre-rich meals to improve insulin sensitivity.' },
  { key: 'endurance', title: 'Endurance / Active Lifestyle', desc: 'Higher-carb, balanced fuelling for active and endurance training.' },
  { key: 'gut', title: 'Gut Reset – Fibre-Rich', desc: 'Diverse fibre and fermented-friendly meals to support gut health.' },
  { key: 'menopause', title: 'Menopause Support', desc: 'Calcium, omega-3 and protein focus for the menopause transition.' },
  { key: 'post_bariatric', title: 'Post-Bariatric – Soft High-Protein', desc: 'Small, soft, protein-forward meals for post-surgery recovery.' },
  { key: 'senior', title: 'Senior Balanced Nutrition', desc: 'Easy-to-prepare, protein- and calcium-rich meals for older adults.' },
  { key: 'combo_chol_wl', title: 'Cholesterol + Weight (Combo)', desc: 'Combines LDL-lowering foods with calorie control for two goals at once.' },
  { key: 'glp1_a', title: 'GLP-1 Support Plan A – High-Protein Volume (Ozempic/Wegovy)', desc: 'Designed for clients on GLP-1 injections: high protein to protect muscle, high-volume/low-energy-density foods, gentle on appetite. Review with prescribing clinician.' },
  { key: 'glp1_b', title: 'GLP-1 Support Plan B – Small Frequent, Protein-Forward (Mounjaro)', desc: 'For GLP-1 therapy: smaller, frequent protein-forward meals to manage reduced appetite and nausea while preserving lean mass. Review with prescribing clinician.' },
]

const byCat = (cat) => R.filter((r) => r.cat === cat)
const pick = (cat, planKey, dayIdx) => {
  const all = byCat(cat)
  const matched = all.filter((r) => r.for.includes(planKey))
  const pool = matched.length ? matched : all.filter((r) => r.for.includes('any'))
  const arr = pool.length ? pool : all
  return arr[dayIdx % arr.length]
}

;(async () => {
  // 0. Clean any prior seed (idempotent re-run): delete seeded plans (cascade
  //    drops their items), then seeded recipes.
  const priorPlans = await rest(`meal_plans?select=id&description=ilike.*${encodeURIComponent(MARKER)}*`).then((r) => r.json())
  if (Array.isArray(priorPlans) && priorPlans.length) {
    const ids = priorPlans.map((p) => p.id)
    await rest(`meal_plan_items?plan_id=in.(${ids.join(',')})`, { method: 'DELETE' })
    await rest(`meal_plans?id=in.(${ids.join(',')})`, { method: 'DELETE' })
  }
  await rest(`recipes?description=ilike.*${encodeURIComponent(MARKER)}*`, { method: 'DELETE' })

  // 1. Insert recipes (published, authored by Rawan).
  const recipePayload = R.map((r) => ({
    created_by: RAWAN,
    title: r.title,
    description: `${r.desc || 'Healthy clinic recipe.'} ${MARKER}`,
    category: r.cat,
    servings: r.serv,
    prep_time_minutes: r.prep,
    cook_time_minutes: r.cook,
    calories_per_serving: r.kcal,
    protein_g: r.p,
    carbs_g: r.c,
    fat_g: r.f,
    dietary_tags: r.tags || [],
    ingredients: r.ing,
    instructions: r.steps.map(step),
    is_published: true,
  }))
  const insertedRecipes = await rest('recipes', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(recipePayload),
  }).then((r) => r.json())
  if (!Array.isArray(insertedRecipes)) { console.error('recipe insert failed:', insertedRecipes); process.exit(1) }
  const idByKey = {}
  R.forEach((r, i) => { idByKey[r.key] = insertedRecipes[i].id })
  console.log(`Inserted ${insertedRecipes.length} recipes.`)

  // 2. Insert each plan + its 7-day items (breakfast, lunch, dinner, snack).
  const today = new Date().toISOString().slice(0, 10)
  let planCount = 0, itemCount = 0
  for (const plan of PLANS) {
    const planRow = await rest('meal_plans', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify([{
        user_id: RAWAN, created_by: RAWAN, nutritionist_id: RAWAN, client_id: null,
        title: plan.title,
        description: `${plan.desc} ${MARKER}`,
        start_date: today, weeks: 1, is_active: false,
      }]),
    }).then((r) => r.json())
    if (!Array.isArray(planRow) || !planRow[0]) { console.error('plan insert failed:', plan.title, planRow); continue }
    const planId = planRow[0].id
    planCount++
    const meals = ['breakfast', 'lunch', 'dinner', 'snack']
    const items = []
    for (let day = 0; day < 7; day++) {
      meals.forEach((meal, mi) => {
        const recipe = pick(meal, plan.key, day)
        if (!recipe) return
        items.push({
          plan_id: planId, meal_plan_id: planId,
          week_idx: 0, day_idx: day, day_of_week: day,
          meal_type: meal, recipe_id: idByKey[recipe.key],
          sort_order: day * 10 + mi,
        })
      })
    }
    await rest('meal_plan_items', { method: 'POST', body: JSON.stringify(items) })
    itemCount += items.length
  }
  console.log(`Inserted ${planCount} meal plans and ${itemCount} plan items.`)
})().catch((e) => { console.error(e); process.exit(1) })
