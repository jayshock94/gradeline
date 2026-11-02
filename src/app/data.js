/* ===== Gradeline sample data (fictional contractor, vendors and people) ===== */
import { GL } from './gl.js';
GL.VERSION = 1;

GL.seed = function () {
  var today = new Date(); today.setHours(0, 0, 0, 0);
  function dayOffset(n) { var d = new Date(today); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); }

  var labor = [
    { id: 'L1', name: 'Foreman', rate: 58 }, { id: 'L2', name: 'Operator', rate: 52 }, { id: 'L3', name: 'Laborer', rate: 38 },
    { id: 'L4', name: 'Truck driver', rate: 44 }, { id: 'L5', name: 'Finisher', rate: 46 }, { id: 'L6', name: 'Flagger', rate: 32 }
  ];
  var equipment = [
    { id: 'E1', name: 'Dozer D6', rate: 118 }, { id: 'E2', name: 'Motor grader 140', rate: 96 }, { id: 'E3', name: 'Excavator 336', rate: 142 },
    { id: 'E4', name: 'Loader 950', rate: 88 }, { id: 'E5', name: 'End dump (tandem)', rate: 72 }, { id: 'E6', name: 'Paver', rate: 210 },
    { id: 'E7', name: 'Roller (steel)', rate: 64 }, { id: 'E8', name: 'Roller (pneumatic)', rate: 58 }, { id: 'E9', name: 'Cold mill', rate: 340 },
    { id: 'E10', name: 'Sweeper', rate: 62 }, { id: 'E11', name: 'Water truck', rate: 54 }, { id: 'E12', name: 'Pickup', rate: 14 },
    { id: 'E13', name: 'Mini excavator', rate: 48 }, { id: 'E14', name: 'Arrow board / attenuator truck', rate: 46 }
  ];
  var materials = [
    { id: 'M1', name: 'Untreated base course', unit: 'TON', cost: 14.5 }, { id: 'M2', name: 'HMA 1/2 in. (supply)', unit: 'TON', cost: 78 },
    { id: 'M3', name: 'Tack coat', unit: 'GAL', cost: 3.2 }, { id: 'M4', name: 'Ready-mix 4000 psi', unit: 'CY', cost: 168 },
    { id: 'M5', name: 'Seed and mulch', unit: 'AC', cost: 1850 }, { id: 'M6', name: 'Diesel', unit: 'GAL', cost: 3.9 }
  ];
  var crews = [
    { id: 'C1', name: 'Grading crew', labor: [['L1', 1], ['L2', 2], ['L3', 1]], equipment: [['E1', 1], ['E2', 1], ['E11', 1], ['E12', 1]], hours: 8 },
    { id: 'C2', name: 'Excavation crew', labor: [['L1', 1], ['L2', 2], ['L4', 3], ['L3', 1]], equipment: [['E3', 1], ['E4', 1], ['E5', 3], ['E12', 1]], hours: 8 },
    { id: 'C3', name: 'Paving crew', labor: [['L1', 1], ['L2', 3], ['L3', 3]], equipment: [['E6', 1], ['E7', 1], ['E8', 1], ['E12', 1]], hours: 10 },
    { id: 'C4', name: 'Milling crew', labor: [['L1', 1], ['L2', 2], ['L4', 3]], equipment: [['E9', 1], ['E10', 1], ['E5', 3]], hours: 8 },
    { id: 'C5', name: 'Base crew', labor: [['L1', 1], ['L2', 2], ['L4', 2], ['L3', 1]], equipment: [['E2', 1], ['E4', 1], ['E5', 2], ['E7', 1], ['E11', 1]], hours: 8 },
    { id: 'C6', name: 'Pipe crew', labor: [['L1', 1], ['L2', 1], ['L3', 3]], equipment: [['E3', 1], ['E13', 1], ['E12', 1]], hours: 8 },
    { id: 'C7', name: 'Concrete crew', labor: [['L1', 1], ['L5', 2], ['L3', 2]], equipment: [['E13', 1], ['E12', 1]], hours: 8 },
    { id: 'C8', name: 'Traffic control crew', labor: [['L6', 4]], equipment: [['E14', 2], ['E12', 1]], hours: 8 }
  ];
  var vendors = [
    { id: 'V1', name: 'Wasatch Pipe & Supply', trade: 'Pipe and precast', contact: 'Lena Ortiz', email: 'quotes@wasatchpipe.example', kind: 'supplier' },
    { id: 'V2', name: 'Timp Precast', trade: 'Pipe and precast', contact: 'Rob Haines', email: 'bids@timpprecast.example', kind: 'supplier' },
    { id: 'V3', name: 'Bonneville Asphalt', trade: 'Asphalt supply', contact: 'Sam Whitaker', email: 'plant@bonnevilleasphalt.example', kind: 'supplier' },
    { id: 'V4', name: 'Granite Peak Materials', trade: 'Asphalt supply', contact: 'Priya Desai', email: 'sales@granitepeak.example', kind: 'supplier' },
    { id: 'V5', name: 'Lineworks Striping', trade: 'Pavement markings', contact: 'Tom Alder', email: 'tom@lineworks.example', kind: 'sub' },
    { id: 'V6', name: 'Roadmark West', trade: 'Pavement markings', contact: 'Ana Ruiz', email: 'estimating@roadmarkwest.example', kind: 'sub' },
    { id: 'V7', name: 'Sunset Concrete', trade: 'Curb and flatwork', contact: 'Marcus Lee', email: 'bids@sunsetconcrete.example', kind: 'sub' },
    { id: 'V8', name: 'High Desert Hydroseed', trade: 'Erosion control', contact: 'Jill Park', email: 'jill@hdhydroseed.example', kind: 'sub' },
    { id: 'V9', name: 'Oquirrh Trucking', trade: 'Hauling', contact: 'Dave Nguyen', email: 'dispatch@oquirrhtrucking.example', kind: 'sub' }
  ];

  var bids = [
    { id: 'B1', name: 'SR-7 Mill & overlay, Spanish Fork', owner: 'State DOT, Region 3', type: 'public', due: dayOffset(6), dueTime: '2:00 PM', estimator: 'Maya R.', status: 'in-progress', location: 'Spanish Fork, UT', note: 'DOT item list imported. Asphalt and pipe quotes due Friday.' },
    { id: 'B2', name: 'Alpine Loop culvert replacements', owner: 'Utah County Public Works', type: 'public', due: dayOffset(21), dueTime: '10:00 AM', estimator: 'Dan K.', status: 'open', total: 1184000, location: 'American Fork Canyon, UT' },
    { id: 'B3', name: 'Vineyard Connector, Phase 1', owner: 'City of Vineyard', type: 'public', due: dayOffset(-4), dueTime: '2:00 PM', estimator: 'Maya R.', status: 'submitted', total: 6421500, location: 'Vineyard, UT' },
    { id: 'B4', name: 'Mill Creek Trail, Phase 2', owner: 'Salt Lake County', type: 'public', due: dayOffset(-33), dueTime: '11:00 AM', estimator: 'Dan K.', status: 'won', total: 2348900, location: 'Millcreek, UT' },
    { id: 'B5', name: 'Hobble Creek bridge deck', owner: 'State DOT, Region 3', type: 'public', due: dayOffset(-41), dueTime: '2:00 PM', estimator: 'Maya R.', status: 'lost', total: 3912000, lowBid: 3701400, location: 'Springville, UT' },
    { id: 'B6', name: 'Airport Rd roundabout', owner: 'City of Heber', type: 'public', due: dayOffset(35), dueTime: '2:00 PM', estimator: 'Dan K.', status: 'draft', location: 'Heber City, UT' },
    { id: 'B7', name: 'Thanksgiving Point lift station site work', owner: 'Private (developer)', type: 'private', due: dayOffset(-58), dueTime: '5:00 PM', estimator: 'Maya R.', status: 'won', total: 874200, location: 'Lehi, UT' },
    { id: 'B8', name: 'Provo Canyon slide repair', owner: 'State DOT, Region 3', type: 'public', due: dayOffset(-12), dueTime: '2:00 PM', estimator: 'Dan K.', status: 'no-bid', location: 'Provo Canyon, UT', note: 'Passed: rock crew booked through December.' },
    { id: 'B9', name: 'Riverbottoms storm drain', owner: 'City of Provo', type: 'public', due: dayOffset(1), dueTime: '11:00 AM', estimator: 'Dan K.', status: 'review', total: 1526300, location: 'Provo, UT' }
  ];

  // The live estimate (bid B1)
  var items = [
    { id: 'I1', code: '01563', name: 'Mobilization', unit: 'LS', qty: 1 },
    { id: 'I2', code: '01570', name: 'Traffic control', unit: 'LS', qty: 1 },
    { id: 'I3', code: '02010', name: 'Clearing and grubbing', unit: 'AC', qty: 3.2 },
    { id: 'I4', code: '02316', name: 'Roadway excavation (unclassified)', unit: 'CY', qty: 18400 },
    { id: 'I5', code: '02317', name: 'Embankment (borrow)', unit: 'CY', qty: 6200 },
    { id: 'I6', code: '02721', name: 'Untreated base course', unit: 'TON', qty: 9800 },
    { id: 'I7', code: '02741', name: 'Cold milling, 2 in.', unit: 'SY', qty: 62500 },
    { id: 'I8', code: '02742', name: 'HMA 1/2 in., PG 64-28', unit: 'TON', qty: 11200 },
    { id: 'I9', code: '02745', name: 'Tack coat', unit: 'GAL', qty: 5600 },
    { id: 'I10', code: '02610', name: 'RCP 24 in., class III', unit: 'LF', qty: 1860 },
    { id: 'I11', code: '02630', name: 'Drainage inlet, type A', unit: 'EA', qty: 14 },
    { id: 'I12', code: '02770', name: 'Curb and gutter, type B1', unit: 'LF', qty: 7400 },
    { id: 'I13', code: '02765', name: 'Pavement markings, 4 in. paint', unit: 'LF', qty: 48000 },
    { id: 'I14', code: '02920', name: 'Seeding and erosion control', unit: 'AC', qty: 2.4 },
    { id: 'I15', code: '02840', name: 'Guardrail, W-beam, remove and replace', unit: 'LF', qty: 640 }
  ];
  var tasks = [
    { id: 'T1', itemId: 'I1', name: 'Move in / move out', type: 'other', amount: 86000 },
    { id: 'T2', itemId: 'I2', name: 'Flagging and devices', type: 'crew', crewId: 'C8', production: 1, qtyOverride: 46, unit: 'DAY', note: 'Priced as 46 crew days' },
    { id: 'T3', itemId: 'I3', name: 'Clear and grub', type: 'crew', crewId: 'C1', production: 0.9 },
    { id: 'T4', itemId: 'I4', name: 'Excavate and haul (2 mi)', type: 'crew', crewId: 'C2', production: 1150 },
    { id: 'T5', itemId: 'I4', name: 'Dump fees', type: 'other', perUnit: 1.1 },
    { id: 'T6', itemId: 'I5', name: 'Place and compact borrow', type: 'crew', crewId: 'C1', production: 1400 },
    { id: 'T7', itemId: 'I5', name: 'Borrow haul', type: 'sub', packageId: 'P4', plug: 6.5 },
    { id: 'T8', itemId: 'I6', name: 'Place base', type: 'crew', crewId: 'C5', production: 1600 },
    { id: 'T9', itemId: 'I6', name: 'Base material', type: 'material', matId: 'M1', per: 1.0 },
    { id: 'T10', itemId: 'I7', name: 'Mill 2 in.', type: 'crew', crewId: 'C4', production: 9500 },
    { id: 'T11', itemId: 'I8', name: 'Pave mainline', type: 'crew', crewId: 'C3', production: 1900 },
    { id: 'T12', itemId: 'I8', name: 'HMA supply', type: 'sub', packageId: 'P2', plug: 78 },
    { id: 'T13', itemId: 'I9', name: 'Tack coat material', type: 'material', matId: 'M3', per: 1.0 },
    { id: 'T14', itemId: 'I9', name: 'Apply tack (with paving crew)', type: 'other', perUnit: 0.35 },
    { id: 'T15', itemId: 'I10', name: 'Trench, lay and backfill', type: 'crew', crewId: 'C6', production: 160 },
    { id: 'T16', itemId: 'I10', name: 'Pipe supply', type: 'sub', packageId: 'P1', plug: 62 },
    { id: 'T17', itemId: 'I11', name: 'Set inlets', type: 'crew', crewId: 'C6', production: 2 },
    { id: 'T18', itemId: 'I11', name: 'Precast inlet supply', type: 'sub', packageId: 'P1', plug: 2400 },
    { id: 'T19', itemId: 'I12', name: 'Curb and gutter (sub)', type: 'sub', packageId: 'P3', plug: 26 },
    { id: 'T20', itemId: 'I13', name: 'Striping (sub)', type: 'sub', packageId: 'P5', plug: 0.42 },
    { id: 'T21', itemId: 'I14', name: 'Hydroseed (sub)', type: 'sub', packageId: 'P6', plug: 2600 }
  ];
  var packages = [
    { id: 'P1', name: 'RCP 24 in. pipe and precast inlets', lines: [{ itemId: 'I10' }, { itemId: 'I11' }], sentAt: dayOffset(-5),
      quotes: [
        { id: 'Q1', vendorId: 'V1', status: 'received', receivedAt: dayOffset(-1), unitPrices: { I10: 58.4, I11: 2310 }, note: 'FOB jobsite, 3-week lead' },
        { id: 'Q2', vendorId: 'V2', status: 'received', receivedAt: dayOffset(-2), unitPrices: { I10: 61.9, I11: 2180 }, lineQty: { I10: 1800 }, note: 'Quoted 1,800 LF' },
        { id: 'Q3', vendorId: 'V9', status: 'declined', note: 'Hauling only' }
      ], selectedQuoteId: 'Q1' },
    { id: 'P2', name: 'HMA 1/2 in. supply (11,200 TON)', lines: [{ itemId: 'I8' }], sentAt: dayOffset(-5),
      quotes: [
        { id: 'Q4', vendorId: 'V3', status: 'received', receivedAt: dayOffset(-1), unitPrices: { I8: 76.5 }, note: 'Index-adjusted; valid 30 days' },
        { id: 'Q5', vendorId: 'V4', status: 'pending', note: 'Promised Friday' }
      ], selectedQuoteId: 'Q4' },
    { id: 'P3', name: 'Curb and gutter', lines: [{ itemId: 'I12' }], sentAt: dayOffset(-4), selfPerform: { crewId: 'C7', production: 420, matId: 'M4', per: 0.062 },
      quotes: [
        { id: 'Q6', vendorId: 'V7', status: 'received', receivedAt: dayOffset(-1), unitPrices: { I12: 24.8 } }
      ], selectedQuoteId: 'Q6' },
    { id: 'P4', name: 'Borrow haul (6,200 CY)', lines: [{ itemId: 'I5' }], sentAt: dayOffset(-3),
      quotes: [
        { id: 'Q7', vendorId: 'V9', status: 'pending', note: 'Dave says Thursday' }
      ], selectedQuoteId: null },
    { id: 'P5', name: 'Pavement markings', lines: [{ itemId: 'I13' }], sentAt: dayOffset(-5),
      quotes: [
        { id: 'Q8', vendorId: 'V5', status: 'received', receivedAt: dayOffset(-2), unitPrices: { I13: 0.38 } },
        { id: 'Q9', vendorId: 'V6', status: 'received', receivedAt: dayOffset(-1), unitPrices: { I13: 0.41 }, note: 'Includes layout' }
      ], selectedQuoteId: 'Q8' },
    { id: 'P6', name: 'Seeding and erosion control', lines: [{ itemId: 'I14' }], sentAt: dayOffset(-3),
      quotes: [
        { id: 'Q10', vendorId: 'V8', status: 'received', receivedAt: dayOffset(-1), unitPrices: { I14: 2450 } }
      ], selectedQuoteId: 'Q10' }
  ];

  var doc = {
    bids: bids,
    library: { labor: labor, equipment: equipment, materials: materials, crews: crews, vendors: vendors },
    currentBidId: 'B1',
    estimates: {
      B1: {
        items: items, tasks: tasks, packages: packages,
        markup: { overhead: 6, profit: 4, bond: 1.2, tax: 0 },
        targetMargin: 9,
        locks: {}
      }
    },
    setup: { rates: true, crews: true, vendors: true, accounting: false, firstBid: true }
  };
  // insight data (last 12 months, oldest first)
  doc.insights = {
    months: ['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'],
    bid: [6, 4, 7, 9, 11, 12, 10, 9, 8, 10, 12, 9],
    won: [2, 1, 2, 3, 4, 3, 3, 2, 3, 3, 4, 3],
    byOwner: [
      { owner: 'State DOT', bid: 38, won: 11, margin: 7.8 },
      { owner: 'Counties', bid: 22, won: 9, margin: 9.1 },
      { owner: 'Cities', bid: 31, won: 12, margin: 9.6 },
      { owner: 'Private', bid: 16, won: 7, margin: 11.2 }
    ],
    unitTrend: [
      { item: 'Roadway excavation', unit: 'CY', bids: 14, avg: 6.42, low: 5.1, high: 8.3 },
      { item: 'HMA 1/2 in.', unit: 'TON', bids: 19, avg: 112.6, low: 98, high: 131 },
      { item: 'RCP 24 in.', unit: 'LF', bids: 9, avg: 148.2, low: 126, high: 171 },
      { item: 'Curb and gutter', unit: 'LF', bids: 16, avg: 31.4, low: 27, high: 36 }
    ],
    lossReview: [
      { bid: 'Hobble Creek bridge deck', spread: 5.7, note: 'Deck pour production too conservative' },
      { bid: 'Jordan River bank repair', spread: 2.1, note: 'Lost on rock sub quote' },
      { bid: 'SR-92 shoulders', spread: 11.4, note: 'Competitor had local pit' }
    ]
  };
  return doc;
};
