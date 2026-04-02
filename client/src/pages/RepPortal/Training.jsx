import React, { useMemo, useState } from 'react';
import { GraduationCap, Shuffle, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';

const flashcards = [
  // Core / House Funders
  { id: 1, category: 'Core / House Funders', lender: 'Idea', front: 'Idea', back: { revReq: '$15,000', fico: '650', nsfs: '3 per month', tib: '3', pos: '1-2', minDeposits: '8', ownership: '50%' } },
  { id: 2, category: 'Core / House Funders', lender: 'Channel Partner', front: 'Channel Partner', back: { revReq: '$15,000', fico: '650', nsfs: '6 total', tib: '3', pos: '1', minDeposits: '5', ownership: '—' } },
  { id: 3, category: 'Core / House Funders', lender: 'CAN', front: 'CAN', back: { revReq: '$10,000', fico: '600', nsfs: '—', tib: '3', pos: '1', minDeposits: '3', ownership: '—' } },
  { id: 4, category: 'Core / House Funders', lender: 'Wall', front: 'Wall', back: { revReq: '$50,000', fico: '575', nsfs: '—', tib: '1', pos: '1-2', minDeposits: '5', ownership: '—' } },
  { id: 5, category: 'Core / House Funders', lender: 'Fund So Fast', front: 'Fund So Fast', back: { revReq: '$25,000', fico: '550', nsfs: '—', tib: '1', pos: '1-5', minDeposits: 'anything', ownership: '51%' } },
  { id: 6, category: 'Core / House Funders', lender: 'LG', front: 'LG', back: { revReq: '$20,000', fico: '600', nsfs: '—', tib: '1.5', pos: '2-4', minDeposits: '1', ownership: '50%' } },
  { id: 7, category: 'Core / House Funders', lender: 'Legend', front: 'Legend', back: { revReq: '$25,000', fico: '600', nsfs: '3 per month', tib: '1', pos: '1-3', minDeposits: '—', ownership: '—' } },
  { id: 8, category: 'Core / House Funders', lender: 'Pinnacle', front: 'Pinnacle', back: { revReq: '$15,000', fico: '550', nsfs: '—', tib: '1', pos: '2-5', minDeposits: '3', ownership: '51%' } },
  { id: 9, category: 'Core / House Funders', lender: 'Specialty', front: 'Specialty', back: { revReq: '$20,000', fico: '—', nsfs: '3 per month', tib: '1', pos: '—', minDeposits: '—', ownership: '—' } },
  { id: 10, category: 'Core / House Funders', lender: 'Britecap', front: 'Britecap', back: { revReq: '$25,000', fico: '660', nsfs: '—', tib: '3', pos: '—', minDeposits: '—', ownership: '—' } },
  // Testing Out
  { id: 11, category: 'Testing Out', lender: 'AFG', front: 'AFG', back: { revReq: '$20,000', fico: '670 (600 EF)', nsfs: '0', tib: '4', pos: 'Case by case', minDeposits: '—', ownership: '—' } },
  { id: 12, category: 'Testing Out', lender: 'Luminar', front: 'Luminar', back: { revReq: '$10,000', fico: '500', nsfs: '5 per month', tib: '1', pos: '—', minDeposits: '—', ownership: '51%' } },
  { id: 13, category: 'Testing Out', lender: 'Everest', front: 'Everest', back: { revReq: '$4,000', fico: '550', nsfs: '10 total', tib: '3 months', pos: '—', minDeposits: '—', ownership: '—' } },
  { id: 14, category: 'Testing Out', lender: 'Everest (Vader)', front: 'Everest (Vader)', back: { revReq: '$4,000', fico: '500', nsfs: '10 total', tib: '1 month', pos: '—', minDeposits: '—', ownership: '—' } },
  // Non-Core 1sts
  { id: 15, category: 'Non-Core 1sts', lender: 'Credibly', front: 'Credibly', back: { revReq: '$20,000', fico: '550', nsfs: '7 per month', tib: '6 months', pos: '—', minDeposits: '3', ownership: '—' } },
  { id: 16, category: 'Non-Core 1sts', lender: 'OnDeck', front: 'OnDeck', back: { revReq: '$10,000', fico: '625', nsfs: '—', tib: '12-31', pos: '—', minDeposits: '2', ownership: '—' } },
  { id: 17, category: 'Non-Core 1sts', lender: 'Libertas', front: 'Libertas', back: { revReq: '$150,000', fico: '650', nsfs: '3 per month', tib: '1-2', pos: '—', minDeposits: '6', ownership: '—' } },
  { id: 18, category: 'Non-Core 1sts', lender: 'Kapitus', front: 'Kapitus', back: { revReq: '$10,000', fico: '625', nsfs: '10 total', tib: '1-2', pos: '1-2', minDeposits: '6', ownership: '50%' } },
  // Low Risk Core
  { id: 19, category: 'Low Risk Core', lender: 'Byzfunder', front: 'Byzfunder', back: { revReq: '$20,000', fico: '550', nsfs: '5 per month', tib: '1', pos: '1-3', minDeposits: '3', ownership: '50%' } },
  { id: 20, category: 'Low Risk Core', lender: 'Fintap', front: 'Fintap', back: { revReq: '$20,000', fico: '600', nsfs: '6 total', tib: '2', pos: '1-4', minDeposits: '5', ownership: '51%' } },
  { id: 21, category: 'Low Risk Core', lender: 'Fundworks', front: 'Fundworks', back: { revReq: '$10,000', fico: '550', nsfs: '8', tib: '1', pos: '1-2', minDeposits: '4', ownership: '51%' } },
  { id: 22, category: 'Low Risk Core', lender: 'Forward', front: 'Forward', back: { revReq: '$10,000', fico: '500', nsfs: '5 per month', tib: '1', pos: '1-5', minDeposits: '3', ownership: '51%' } },
  { id: 23, category: 'Low Risk Core', lender: 'Headway', front: 'Headway', back: { revReq: '$10,000', fico: '625', nsfs: '—', tib: '1', pos: '1-4', minDeposits: '—', ownership: '51%' } },
  // Medium Risk
  { id: 24, category: 'Medium Risk', lender: 'Pearl', front: 'Pearl', back: { revReq: '$20,000', fico: 'None', nsfs: '4', tib: '6 months', pos: '1-4', minDeposits: '—', ownership: '—' } },
  { id: 25, category: 'Medium Risk', lender: 'Cedar', front: 'Cedar', back: { revReq: '$200,000', fico: '600', nsfs: '3 per month', tib: '1', pos: '2-5', minDeposits: '4', ownership: '50%' } },
  { id: 26, category: 'Medium Risk', lender: 'Smarter Merchant', front: 'Smarter Merchant', back: { revReq: '$15,000', fico: '500', nsfs: '$5.00', tib: '1', pos: '1-4', minDeposits: '$5.00', ownership: '—' } },
  { id: 27, category: 'Medium Risk', lender: 'Spartan', front: 'Spartan', back: { revReq: '$15,000', fico: '550', nsfs: '$5.00', tib: '1 year (2 years?)', pos: '1-6', minDeposits: '$5.00', ownership: '—' } },
  // High Risk Preferred
  { id: 28, category: 'High Risk Preferred', lender: 'Bitty', front: 'Bitty', back: { revReq: '$5,000', fico: '551', nsfs: '6 last, 20 total', tib: '6 months', pos: '—', minDeposits: '—', ownership: '—' } },
  { id: 29, category: 'High Risk Preferred', lender: 'Immediate Advances (Arsenal)', front: 'Immediate Advances (Arsenal)', back: { revReq: '$25,000', fico: '500', nsfs: '—', tib: '1', pos: '1-5', minDeposits: '—', ownership: '—' } },
  { id: 30, category: 'High Risk Preferred', lender: 'CFG', front: 'CFG', back: { revReq: '$8,000', fico: '450', nsfs: '6', tib: '6 months', pos: '—', minDeposits: '—', ownership: '—' } },
  { id: 31, category: 'High Risk Preferred', lender: 'GFE', front: 'GFE', back: { revReq: '$15,000', fico: '550', nsfs: '5 per month', tib: '6 months', pos: '1-5', minDeposits: '4', ownership: '—' } },
  { id: 32, category: 'High Risk Preferred', lender: 'Mayfair', front: 'Mayfair', back: { revReq: '—', fico: '—', nsfs: '—', tib: '3', pos: '2+', minDeposits: '—', ownership: '—' } },
  { id: 33, category: 'High Risk Preferred', lender: 'Iruka', front: 'Iruka', back: { revReq: '$75,000', fico: '—', nsfs: '—', tib: '—', pos: '2-6', minDeposits: '—', ownership: '—' } },
  { id: 34, category: 'High Risk Preferred', lender: 'Cobalt', front: 'Cobalt', back: { revReq: '$40,000', fico: 'No min', nsfs: '5 per month', tib: '1', pos: '—', minDeposits: '5', ownership: '—' } },
  // Last Resort Funding
  { id: 35, category: 'Last Resort Funding', lender: 'FBC', front: 'FBC', back: { revReq: 'No min', fico: 'No min', nsfs: 'No min', tib: '3 months', pos: '—', minDeposits: 'No min', ownership: '—' } },
  { id: 36, category: 'Last Resort Funding', lender: 'Lily', front: 'Lily', back: { revReq: '$8,000', fico: 'No min', nsfs: '—', tib: '1', pos: '1-4', minDeposits: 'No min', ownership: '—' } },
  { id: 37, category: 'Last Resort Funding', lender: 'JW Capital', front: 'JW Capital', back: { revReq: '$50,000', fico: 'No min', nsfs: '—', tib: '1', pos: '—', minDeposits: '—', ownership: '—' } },
  { id: 38, category: 'Last Resort Funding', lender: 'Amerifi', front: 'Amerifi', back: { revReq: '$50,000', fico: 'No min', nsfs: 'No min', tib: '1', pos: '2-7', minDeposits: '—', ownership: '—' } },
  { id: 39, category: 'Last Resort Funding', lender: 'Lendini', front: 'Lendini', back: { revReq: '$5,000', fico: '550', nsfs: '6 last, 20 total', tib: '8 months', pos: '1-4', minDeposits: '3', ownership: '—' } },
  { id: 40, category: 'Last Resort Funding', lender: 'Nexi', front: 'Nexi', back: { revReq: '$25,000', fico: '550', nsfs: '5 per month', tib: '1', pos: '1-8', minDeposits: '—', ownership: '—' } },
  { id: 41, category: 'Last Resort Funding', lender: 'Fundfi', front: 'Fundfi', back: { revReq: '$25,000', fico: '—', nsfs: '5 max', tib: '1', pos: '1-5', minDeposits: '8', ownership: '—' } },
  { id: 42, category: 'Last Resort Funding', lender: 'Throttle', front: 'Throttle', back: { revReq: '$40,000', fico: '550', nsfs: '9 total', tib: '1', pos: '1-5', minDeposits: '5', ownership: '—' } },
  { id: 43, category: 'Last Resort Funding', lender: 'Velocity', front: 'Velocity', back: { revReq: '$20,000', fico: '500', nsfs: '3 per month', tib: '1', pos: '1-4', minDeposits: '3', ownership: '—' } },
  { id: 44, category: 'Last Resort Funding', lender: 'Smart Step', front: 'Smart Step', back: { revReq: '$10,000', fico: '—', nsfs: '—', tib: '2', pos: '—', minDeposits: '5', ownership: '—' } },
  { id: 45, category: 'Last Resort Funding', lender: 'Garden', front: 'Garden', back: { revReq: '$20,000', fico: '—', nsfs: '6 total', tib: '6 months', pos: '—', minDeposits: '—', ownership: '—' } },
  // Situational Lenders
  { id: 46, category: 'Situational Lenders', lender: 'Rapid', front: 'Rapid', back: { revReq: '—', fico: '—', nsfs: '—', tib: '—', pos: '—', minDeposits: '—', ownership: '—' } },
  { id: 47, category: 'Situational Lenders', lender: 'Greenbox', front: 'Greenbox', back: { revReq: '$10,000', fico: '500', nsfs: '—', tib: '5 months', pos: '1-2', minDeposits: '2', ownership: '—' } },
  { id: 48, category: 'Situational Lenders', lender: 'INadvance', front: 'INadvance', back: { revReq: '—', fico: '—', nsfs: '—', tib: '—', pos: '—', minDeposits: '—', ownership: '—' } },
  { id: 49, category: 'Situational Lenders', lender: 'Backd', front: 'Backd', back: { revReq: '—', fico: '—', nsfs: '—', tib: '—', pos: '—', minDeposits: '—', ownership: '—' } },
  // Canada Lenders
  { id: 50, category: 'Canada Lenders', lender: 'Greenbox', front: 'Greenbox (Canada)', back: { revReq: '$10,000', fico: '400', nsfs: '—', tib: '5 months', pos: '—', minDeposits: '2', ownership: '—' } },
  { id: 51, category: 'Canada Lenders', lender: 'Journey', front: 'Journey', back: { revReq: '$8,000', fico: '550', nsfs: '3 per month', tib: '6 months', pos: '—', minDeposits: '8', ownership: '—' } },
  { id: 52, category: 'Canada Lenders', lender: '2M7', front: '2M7', back: { revReq: '$15,000', fico: '—', nsfs: '—', tib: '3 months', pos: '1-5', minDeposits: '3', ownership: '—' } },
  { id: 53, category: 'Canada Lenders', lender: 'Merchant Growth', front: 'Merchant Growth', back: { revReq: '$10,000', fico: '550', nsfs: '—', tib: '6 months', pos: '—', minDeposits: '5', ownership: '—' } },
  { id: 54, category: 'Canada Lenders', lender: 'CanaCap', front: 'CanaCap', back: { revReq: '$10,000', fico: '—', nsfs: '—', tib: '—', pos: '—', minDeposits: '—', ownership: '—' } },
  { id: 55, category: 'Canada Lenders', lender: 'ICapital', front: 'ICapital', back: { revReq: '$15,000', fico: '600', nsfs: '—', tib: '—', pos: '12-31', minDeposits: '—', ownership: '—' } },
  { id: 56, category: 'Canada Lenders', lender: 'Fundfi', front: 'Fundfi (Canada)', back: { revReq: '$25,000', fico: '—', nsfs: '5 max', tib: '1', pos: '1-5', minDeposits: '8', ownership: '—' } },
  { id: 57, category: 'Canada Lenders', lender: 'Sheaves', front: 'Sheaves', back: { revReq: '$20,000', fico: '500', nsfs: '—', tib: '6 months (will look at 4)', pos: '—', minDeposits: '—', ownership: '—' } },
  { id: 58, category: 'Canada Lenders', lender: 'Ontap', front: 'Ontap', back: { revReq: '$25,000', fico: 'none', nsfs: '4 per month', tib: '1', pos: '1-4', minDeposits: '—', ownership: '—' } },
  { id: 59, category: 'Canada Lenders', lender: 'KM Capital', front: 'KM Capital', back: { revReq: '$15,000', fico: '450', nsfs: '3 per month', tib: '1', pos: '1-5', minDeposits: '—', ownership: '—' } },
  { id: 60, category: 'Canada Lenders', lender: 'Newco', front: 'Newco (Canada)', back: { revReq: '$30,000', fico: '—', nsfs: '7 per month', tib: '1', pos: '—', minDeposits: '—', ownership: '—' } },
];

const CATEGORY_COLORS = {
  'Core / House Funders': 'bg-blue-100 text-blue-700',
  'Testing Out': 'bg-amber-100 text-amber-700',
  'Non-Core 1sts': 'bg-purple-100 text-purple-700',
  'Low Risk Core': 'bg-green-100 text-green-700',
  'Medium Risk': 'bg-orange-100 text-orange-700',
  'High Risk Preferred': 'bg-red-100 text-red-700',
  'Last Resort Funding': 'bg-gray-200 text-gray-700',
  'Situational Lenders': 'bg-cyan-100 text-cyan-700',
  'Canada Lenders': 'bg-rose-100 text-rose-700',
};

function shuffleArray(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export default function Training() {
  const categories = useMemo(() => ['All', ...new Set(flashcards.map(c => c.category))], []);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [deck, setDeck] = useState(flashcards);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const filteredDeck = useMemo(() => {
    return selectedCategory === 'All' ? deck : deck.filter(c => c.category === selectedCategory);
  }, [selectedCategory, deck]);

  const card = filteredDeck[index] || null;

  const goNext = () => { setFlipped(false); setIndex(i => (i + 1) % filteredDeck.length); };
  const goPrev = () => { setFlipped(false); setIndex(i => (i - 1 + filteredDeck.length) % filteredDeck.length); };
  const handleShuffle = () => { setDeck(shuffleArray); setIndex(0); setFlipped(false); };
  const handleReset = () => { setDeck(flashcards); setIndex(0); setFlipped(false); };

  const badgeCls = CATEGORY_COLORS[card?.category] || 'bg-gray-100 text-gray-600';

  return (
    <div className="p-6 space-y-5 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 tracking-tight flex items-center gap-2.5">
          <GraduationCap size={22} className="text-blue-600" /> Lender Training
        </h1>
        <p className="text-gray-400 text-sm mt-0.5">Flip cards to memorize lender requirements — {flashcards.length} lenders across {categories.length - 1} categories</p>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={selectedCategory}
          onChange={e => { setSelectedCategory(e.target.value); setIndex(0); setFlipped(false); }}
          className="bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 min-w-[220px]"
        >
          {categories.map(cat => <option key={cat} value={cat}>{cat} {cat !== 'All' ? `(${flashcards.filter(c => c.category === cat).length})` : `(${flashcards.length})`}</option>)}
        </select>
        <button onClick={handleShuffle} className="flex items-center gap-1.5 px-3.5 py-2.5 text-sm font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors">
          <Shuffle size={14} /> Shuffle
        </button>
        <button onClick={handleReset} className="flex items-center gap-1.5 px-3.5 py-2.5 text-sm font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors">
          <RotateCcw size={14} /> Reset
        </button>
      </div>

      {card ? (
        <>
          {/* Meta */}
          <div className="flex items-center justify-between">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${badgeCls}`}>{card.category}</span>
            <span className="text-gray-400 text-sm font-medium">{index + 1} / {filteredDeck.length}</span>
          </div>

          {/* Card */}
          <div
            className="cursor-pointer"
            style={{ perspective: '1200px', height: 420 }}
            onClick={() => setFlipped(f => !f)}
          >
            <div style={{
              position: 'relative', width: '100%', height: '100%',
              transition: 'transform 0.6s ease',
              transformStyle: 'preserve-3d',
              transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
            }}>
              {/* Front */}
              <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
                className="bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col items-center justify-center text-center p-8"
              >
                <p className="text-xs font-semibold uppercase tracking-widest text-blue-500 mb-3">Lender</p>
                <p className="text-4xl font-bold text-gray-900 leading-tight">{card.front}</p>
                <p className="text-gray-300 text-sm mt-5">tap to flip</p>
              </div>

              {/* Back */}
              <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 flex flex-col"
              >
                <p className="text-xl font-bold text-gray-900 mb-4">{card.lender}</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 flex-1">
                  {[
                    { label: 'REV REQ', value: card.back.revReq },
                    { label: 'FICO', value: card.back.fico },
                    { label: 'NSFs', value: card.back.nsfs },
                    { label: 'TIB', value: card.back.tib },
                    { label: 'POS', value: card.back.pos },
                    { label: 'MIN DEPOSITS', value: card.back.minDeposits },
                    { label: 'OWNERSHIP', value: card.back.ownership },
                  ].map(f => (
                    <div key={f.label} className="bg-gray-50 border border-gray-100 rounded-xl p-3">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1">{f.label}</p>
                      <p className="text-base font-bold text-gray-900">{f.value || '—'}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-center gap-3">
            <button onClick={goPrev} className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors">
              <ChevronLeft size={16} /> Prev
            </button>
            <button onClick={() => setFlipped(f => !f)} className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium px-5 py-2.5 rounded-xl transition-colors">
              Flip
            </button>
            <button onClick={goNext} className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors">
              Next <ChevronRight size={16} />
            </button>
          </div>
        </>
      ) : (
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-8 text-center text-gray-400">
          No cards in this category.
        </div>
      )}
    </div>
  );
}
