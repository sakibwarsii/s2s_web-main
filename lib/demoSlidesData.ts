export interface DemoSlide {
  id: number;
  title: string;
  subtitle: string;
  points: string[];
  analogy?: string;
  formula?: string;
  badge?: string;
  imagePath: string;
  category: string;
  accentColor: string;
}

export interface DemoTopicSlides {
  id: string;
  topicTitle: string;
  icon: string;
  totalDurationSeconds: number; // ~100s (~1m 40s - 2 mins)
  slideIntervalMs: number; // 20000ms = 20s per slide (exceeds 5s minimum)
  slides: DemoSlide[];
}

export const DEMO_TOPICS_REGISTRY: Record<string, DemoTopicSlides> = {
  photosynthesis: {
    id: "photosynthesis",
    topicTitle: "Photosynthesis: Nature's Solar Kitchen",
    icon: "🌱",
    totalDurationSeconds: 100,
    slideIntervalMs: 20000,
    slides: [
      {
        id: 1,
        title: "Welcome to Photosynthesis",
        subtitle: "How Plants Transform Sunlight into Life",
        points: [
          "Green plants create food for all living creatures on Earth",
          "Converts solar photon energy into stable chemical bonds",
          "Powers 99% of all biological ecosystems"
        ],
        analogy: "Like a self-sustaining solar kitchen running on pure sunshine.",
        badge: "Core Biology",
        imagePath: "/demo_images/photosynthesis/slide_01.svg",
        category: "Introduction",
        accentColor: "#10b981"
      },
      {
        id: 2,
        title: "The Golden Sun: Radiant Energy",
        subtitle: "The Cosmic Powerplant",
        points: [
          "Emits photons across ultraviolet, visible, and infrared spectra",
          "Plants capture red and blue wavelengths of visible light",
          "Reflect green light, giving leaves their vibrant emerald color"
        ],
        analogy: "Solar panels on a rooftop capturing morning rays.",
        badge: "Energy Source",
        imagePath: "/demo_images/photosynthesis/slide_02.svg",
        category: "Energy Source",
        accentColor: "#f59e0b"
      },
      {
        id: 3,
        title: "Leaf Anatomy: Nature's Solar Panel",
        subtitle: "Engineered for Maximum Light Harvest",
        points: [
          "Broad, thin blade maximizes surface area facing the sky",
          "Waxy cuticle prevents water evaporation on hot days",
          "Interconnected vein network transports nutrients rapidly"
        ],
        analogy: "A thin wafer-shaped factory oriented toward the sun.",
        badge: "Plant Anatomy",
        imagePath: "/demo_images/photosynthesis/slide_03.svg",
        category: "Plant Anatomy",
        accentColor: "#10b981"
      },
      {
        id: 4,
        title: "Stomata: The Breathing Pores",
        subtitle: "Microscopic Valves Under the Leaf",
        points: [
          "Tiny guard cells open and close like biological doorways",
          "Takes in Carbon Dioxide (CO2) from surrounding air",
          "Releases water vapor through transpiration"
        ],
        analogy: "Tiny windows opening for fresh air in a kitchen.",
        badge: "Gas Exchange",
        imagePath: "/demo_images/photosynthesis/slide_04.svg",
        category: "Gas Exchange",
        accentColor: "#06b6d4"
      },
      {
        id: 5,
        title: "Atmospheric Carbon Dioxide (CO2)",
        subtitle: "The Invisible Building Block",
        points: [
          "Absorbed through stomatal pores from the air",
          "Provides the carbon atoms needed to build glucose sugar",
          "Helps balance Earth's atmospheric greenhouse effect"
        ],
        formula: "6 CO2 + 6 H2O + Light → C6H12O6 + 6 O2",
        badge: "Raw Materials",
        imagePath: "/demo_images/photosynthesis/slide_05.svg",
        category: "Raw Materials",
        accentColor: "#8b5cf6"
      }
    ]
  },
  ohms_law: {
    id: "ohms_law",
    topicTitle: "Ohm's Law: The Heart of Electronics",
    icon: "⚡",
    totalDurationSeconds: 100,
    slideIntervalMs: 20000,
    slides: [
      {
        id: 1,
        title: "Introduction to Ohm's Law",
        subtitle: "The Governing Rule of Electrical Circuits",
        points: [
          "Formulated by German physicist Georg Simon Ohm in 1827",
          "Establishes relationship between Voltage, Current, and Resistance",
          "Forms the universal foundation of modern electrical engineering"
        ],
        analogy: "The three golden rules that dictate how electricity moves.",
        badge: "Physics Foundation",
        imagePath: "/demo_images/ohms_law/slide_01.svg",
        category: "Introduction",
        accentColor: "#3b82f6"
      },
      {
        id: 2,
        title: "Voltage (V): Electrical Pressure",
        subtitle: "The Push That Drives Charges",
        points: [
          "Measured in Volts (V), representing potential difference",
          "Creates electrical force causing electrons to travel",
          "Supplied by batteries, generators, and solar cells"
        ],
        analogy: "Water pressure pumped from a high water tank.",
        badge: "Voltage",
        imagePath: "/demo_images/ohms_law/slide_02.svg",
        category: "Voltage",
        accentColor: "#f59e0b"
      },
      {
        id: 3,
        title: "Current (I): Flow of Electrons",
        subtitle: "Count of Moving Electric Charges",
        points: [
          "Measured in Amperes (A) or Amps",
          "Quantifies coulombs of charge passing a cross-section per second",
          "Flows from negative to positive terminals internally"
        ],
        analogy: "The volume of water rushing through a garden hose.",
        badge: "Current",
        imagePath: "/demo_images/ohms_law/slide_03.svg",
        category: "Current",
        accentColor: "#10b981"
      },
      {
        id: 4,
        title: "Resistance (R): Opposition to Flow",
        subtitle: "The Obstacle Course for Electrons",
        points: [
          "Measured in Ohms (Ω)",
          "Collisions between moving electrons and atomic lattice produce heat",
          "Used deliberately to control current and create thermal warmth"
        ],
        analogy: "A bottleneck or valve restricting water flow.",
        badge: "Resistance",
        imagePath: "/demo_images/ohms_law/slide_04.svg",
        category: "Resistance",
        accentColor: "#ef4444"
      },
      {
        id: 5,
        title: "The Master Equation: V = I × R",
        subtitle: "Visualizing the Triad Clearly",
        points: [
          "Voltage equals Current multiplied by Resistance (V = I × R)",
          "Double the voltage doubles the current in a fixed circuit",
          "Higher resistance reduces current at constant voltage"
        ],
        formula: "V = I × R | I = V / R | R = V / I",
        badge: "The Formula",
        imagePath: "/demo_images/ohms_law/slide_05.svg",
        category: "Equation",
        accentColor: "#8b5cf6"
      }
    ]
  },
  thirsty_crow: {
    id: "thirsty_crow",
    topicTitle: "The Thirsty Crow: Wisdom & Perseverance",
    icon: "🐦",
    totalDurationSeconds: 100,
    slideIntervalMs: 20000,
    slides: [
      {
        id: 1,
        title: "A Scorching Summer Afternoon",
        subtitle: "Heat Shimmers Across the Dusty Earth",
        points: [
          "The sun blazed brightly in the cloudless blue sky",
          "Ponds and puddles had all dried into cracked mud",
          "A lone black crow flew tirelessly in search of water"
        ],
        analogy: "Like being outside on a 45°C afternoon without a water bottle.",
        badge: "Aesop's Fable",
        imagePath: "/demo_images/thirsty_crow/slide_01.svg",
        category: "Introduction",
        accentColor: "#f59e0b"
      },
      {
        id: 2,
        title: "A Glint in the Garden",
        subtitle: "Discovery of a Clay Water Pitcher",
        points: [
          "Beneath a leafy mango tree, he spotted an earthen pot (surahi)",
          "His sharp black eyes caught the reflection of something inside",
          "With renewed hope, he swooped down to the courtyard"
        ],
        analogy: "An oasis appearing amidst a desolate landscape.",
        badge: "Discovery",
        imagePath: "/demo_images/thirsty_crow/slide_02.svg",
        category: "Discovery",
        accentColor: "#10b981"
      },
      {
        id: 3,
        title: "The Dilemma: Water Out of Reach",
        subtitle: "A Narrow Neck & Low Water Level",
        points: [
          "The water level was very low, barely filling the base",
          "The crow stretched his neck as far as he could",
          "His sharp beak fell two inches short of touching the water"
        ],
        analogy: "Trying to reach the last coin dropped into a deep piggy bank.",
        badge: "The Challenge",
        imagePath: "/demo_images/thirsty_crow/slide_03.svg",
        category: "Obstacle",
        accentColor: "#ef4444"
      },
      {
        id: 4,
        title: "The Clever Idea: Water Displacement",
        subtitle: "Dropping Pebbles One by One",
        points: [
          "Noticing pebbles nearby, the crow formulates a brilliant plan",
          "Each pebble dropped displaces water upward in the narrow vessel",
          "Combines patient repetition with fundamental physical laws"
        ],
        analogy: "Archimedes' principle of liquid displacement in action.",
        badge: "Ingenuity",
        imagePath: "/demo_images/thirsty_crow/slide_04.svg",
        category: "Solution",
        accentColor: "#06b6d4"
      },
      {
        id: 5,
        title: "Where There's a Will, There's a Way!",
        subtitle: "Quenching Thirst Through Determination",
        points: [
          "Water rises to the brim and the crow drinks his fill",
          "Demonstrates that patience and intellect conquer brute force",
          "Modern ornithology confirms crows are master problem solvers"
        ],
        analogy: "Every great victory is achieved stone by stone.",
        badge: "Moral of the Story",
        imagePath: "/demo_images/thirsty_crow/slide_05.svg",
        category: "Moral",
        accentColor: "#10b981"
      }
    ]
  },
  profit_and_loss: {
    id: "profit_and_loss",
    topicTitle: "Profit & Loss: Commercial Mathematics",
    icon: "🏪",
    totalDurationSeconds: 100,
    slideIntervalMs: 20000,
    slides: [
      {
        id: 1,
        title: "Welcome to Everyday Business",
        subtitle: "The Mathematics of Buying & Selling",
        points: [
          "Commercial arithmetic underpins all trade, finance, and shops",
          "Teaches how merchants determine price and calculate success",
          "Essential skill for daily financial literacy and smart choices"
        ],
        analogy: "Managing your pocket money and personal expenses.",
        badge: "Commercial Math",
        imagePath: "/demo_images/profit_loss/slide_01.svg",
        category: "Introduction",
        accentColor: "#10b981"
      },
      {
        id: 2,
        title: "Cost Price (CP) vs Selling Price (SP)",
        subtitle: "Understanding Commercial Terms",
        points: [
          "Cost Price (CP): Amount paid to buy or manufacture goods",
          "Selling Price (SP): Amount received from selling to the customer",
          "Overhead costs (transport, rent, taxes) are added to base CP"
        ],
        formula: "Total CP = Purchase Price + Overheads",
        badge: "Core Terminology",
        imagePath: "/demo_images/profit_loss/slide_02.svg",
        category: "Cost Price",
        accentColor: "#f59e0b"
      },
      {
        id: 3,
        title: "Calculating Profit (Gain)",
        subtitle: "When Selling Price Exceeds Cost Price (SP > CP)",
        points: [
          "When SP is greater than CP, a financial Gain or Profit occurs",
          "Profit equals Selling Price minus Cost Price (SP - CP)",
          "Indicates a healthy, sustainable business margin"
        ],
        formula: "Profit = SP - CP",
        badge: "Profit Equation",
        imagePath: "/demo_images/profit_loss/slide_03.svg",
        category: "Profit",
        accentColor: "#10b981"
      },
      {
        id: 4,
        title: "Calculating Loss",
        subtitle: "When Cost Price Exceeds Selling Price (CP > SP)",
        points: [
          "When goods are sold for less than their cost, a Loss occurs",
          "Loss equals Cost Price minus Selling Price (CP - SP)",
          "Occurs during clearance sales, perishable spoilages, or discounts"
        ],
        formula: "Loss = CP - SP",
        badge: "Loss Equation",
        imagePath: "/demo_images/profit_loss/slide_04.svg",
        category: "Loss",
        accentColor: "#ef4444"
      },
      {
        id: 5,
        title: "Profit & Loss Percentages",
        subtitle: "Standardizing Performance Comparison",
        points: [
          "Profit % and Loss % are always calculated with respect to Cost Price",
          "Enables fair comparison between small and large businesses",
          "Widely used in commerce, stock markets, and retail discounts"
        ],
        formula: "Profit % = (Profit / CP) × 100 | Loss % = (Loss / CP) × 100",
        badge: "Percentage Rules",
        imagePath: "/demo_images/profit_loss/slide_05.svg",
        category: "Summary",
        accentColor: "#8b5cf6"
      }
    ]
  },
  supply_and_demand: {
    id: "supply_and_demand",
    topicTitle: "Supply & Demand: Market Fundamentals",
    icon: "🍪",
    totalDurationSeconds: 100,
    slideIntervalMs: 20000,
    slides: [
      {
        id: 1,
        title: "Introduction to Market Economics",
        subtitle: "How Prices are Decided in Free Markets",
        points: [
          "The invisible engine that balances what people want with what exists",
          "Governs the prices of groceries, gadgets, energy, and real estate",
          "Rooted in human choices, trade, and economic incentives"
        ],
        analogy: "A giant economic see-saw balancing buyers and sellers.",
        badge: "Economics",
        imagePath: "/demo_images/supply_demand/slide_01.svg",
        category: "Introduction",
        accentColor: "#10b981"
      },
      {
        id: 2,
        title: "The Law of Demand",
        subtitle: "Inverse Relationship Between Price and Quantity",
        points: [
          "As price goes up, consumer quantity demanded goes down",
          "When price drops, buyers are eager to purchase more",
          "Visualized by a downward-sloping demand curve"
        ],
        analogy: "More shoppers buy ice cream when it is half-price.",
        badge: "Law of Demand",
        imagePath: "/demo_images/supply_demand/slide_02.svg",
        category: "Demand",
        accentColor: "#3b82f6"
      },
      {
        id: 3,
        title: "The Law of Supply",
        subtitle: "Direct Relationship Between Price and Quantity Supplied",
        points: [
          "As market price rises, producers are motivated to supply more",
          "Lower prices discourage high production due to tighter margins",
          "Visualized by an upward-sloping supply curve"
        ],
        analogy: "Farmers plant more crops when market prices are high.",
        badge: "Law of Supply",
        imagePath: "/demo_images/supply_demand/slide_03.svg",
        category: "Supply",
        accentColor: "#f59e0b"
      },
      {
        id: 4,
        title: "Market Equilibrium Price",
        subtitle: "The Point Where Supply Meets Demand",
        points: [
          "The intersection where Quantity Demanded equals Quantity Supplied",
          "Establishes the natural market clearing price",
          "No excess goods remain, and all willing buyers are satisfied"
        ],
        formula: "Qs = Qd → Market Equilibrium",
        badge: "Equilibrium",
        imagePath: "/demo_images/supply_demand/slide_04.svg",
        category: "Equilibrium",
        accentColor: "#06b6d4"
      },
      {
        id: 5,
        title: "Shortages, Surpluses & Price Shifts",
        subtitle: "How Real Markets Self-Correct",
        points: [
          "Shortage: When demand exceeds supply, prices rise naturally",
          "Surplus: When supply exceeds demand, prices fall to clear stock",
          "Market dynamics dynamically restore economic balance"
        ],
        analogy: "Water finding its level in connected vessels.",
        badge: "Market Balance",
        imagePath: "/demo_images/supply_demand/slide_05.svg",
        category: "Summary",
        accentColor: "#8b5cf6"
      }
    ]
  },
  indus_valley: {
    id: "indus_valley",
    topicTitle: "Indus Valley: Ancient Urban Pioneers",
    icon: "🏛️",
    totalDurationSeconds: 100,
    slideIntervalMs: 20000,
    slides: [
      {
        id: 1,
        title: "Journey 4,500 Years Back in Time",
        subtitle: "The Bronze Age Urban Wonder (c. 2600–1900 BCE)",
        points: [
          "One of Earth's earliest mature urban civilizations",
          "Thrived across modern India and Pakistan along fertile rivers",
          "Known for peaceful society, arts, and astonishing cleanliness"
        ],
        analogy: "The Manhattan and London of the ancient Bronze Age world.",
        badge: "History & Heritage",
        imagePath: "/demo_images/indus_valley/slide_01.svg",
        category: "Introduction",
        accentColor: "#d97706"
      },
      {
        id: 2,
        title: "Geographical Map: The Fertile Plains",
        subtitle: "Covering Over 1 Million Square Kilometers",
        points: [
          "Encompassed major hubs like Harappa, Mohenjo-daro, and Dholavira",
          "Flourished alongside the mighty Indus and Ghaggar-Hakra rivers",
          "Benefited from seasonal floods that enriched agricultural soils"
        ],
        analogy: "A vast connected network of river valley trading towns.",
        badge: "Geography",
        imagePath: "/demo_images/indus_valley/slide_02.svg",
        category: "Geography",
        accentColor: "#3b82f6"
      },
      {
        id: 3,
        title: "Advanced Grid City Planning",
        subtitle: "Standardized Burnt Bricks & Parallel Streets",
        points: [
          "Streets laid out in precise north-south and east-west grids",
          "Constructed using standard baked bricks in a 1:2:4 ratio",
          "Two-tier layout: Citadel for public buildings, Lower Town for homes"
        ],
        analogy: "Modern city master planning pioneered millennia ago.",
        badge: "Urban Planning",
        imagePath: "/demo_images/indus_valley/slide_03.svg",
        category: "Architecture",
        accentColor: "#10b981"
      },
      {
        id: 4,
        title: "The Great Bath & Drainage Systems",
        subtitle: "World's First Underground Sanitation Network",
        points: [
          "The Great Bath at Mohenjo-daro: Waterproofed public reservoir",
          "Every house had a private bathroom connected to covered street drains",
          "Inspection holes allowed regular maintenance and cleaning"
        ],
        analogy: "A sanitation system centuries ahead of medieval Europe.",
        badge: "Sanitation",
        imagePath: "/demo_images/indus_valley/slide_04.svg",
        category: "Drainage",
        accentColor: "#06b6d4"
      },
      {
        id: 5,
        title: "Harappan Trade, Seals & Legacy",
        subtitle: "Maritime Commerce Across the Arabian Sea",
        points: [
          "Traded carnelian, lapis lazuli, and cotton with ancient Mesopotamia",
          "Standardized weights and decimal-based measurement systems",
          "Left an enduring cultural legacy of architectural precision and peace"
        ],
        analogy: "Ancient international trade routes connecting distant empires.",
        badge: "Trade & Legacy",
        imagePath: "/demo_images/indus_valley/slide_05.svg",
        category: "Summary",
        accentColor: "#8b5cf6"
      }
    ]
  }
};
