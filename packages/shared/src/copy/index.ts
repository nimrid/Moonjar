export interface CompanyKidCopy {
  symbol: string;
  name: string;
  tagline: string;
  little: {
    whatTheyDo: string;
    whyCool: string;
    funFact: string;
  };
  big: {
    symbol?: string;
    whatTheyDo: string;
    whyCool: string;
    funFact: string;
  };
}

export const COMPANY_BLURBS: Record<string, CompanyKidCopy> = {
  SPACEX: {
    symbol: 'SPACEX',
    name: 'SpaceX',
    tagline: 'Reusable rockets reaching for the stars',
    little: {
      whatTheyDo: 'SpaceX makes big rockets. The rockets fly into space. Then they land safely. They can fly again and again!',
      whyCool: 'Most rockets get thrown away. SpaceX rockets can be used again, just like airplanes!',
      funFact: 'Their rocket boosters land on a robot ship in the ocean.',
    },
    big: {
      symbol: 'SPACEX',
      whatTheyDo: 'SpaceX builds reusable rockets and spacecraft. Their rockets deliver satellites into orbit and land back on Earth. This makes space travel much cheaper.',
      whyCool: 'Reusing rockets dropped launch costs by over 70 percent. It opens up space missions to the Moon and Mars.',
      funFact: 'Starlink beams fast internet to remote schools and ships all across the world.',
    },
  },
  ANDURIL: {
    symbol: 'ANDURIL',
    name: 'Anduril',
    tagline: 'Smart machines helping protect people and peace',
    little: {
      whatTheyDo: 'Anduril builds smart machines. They make flying drones and towers. The machines watch borders and keep people safe.',
      whyCool: 'Their computers spot danger from far away. They help people stay out of harm.',
      funFact: 'The company is named after a glowing sword from a famous story.',
    },
    big: {
      symbol: 'ANDURIL',
      whatTheyDo: 'Anduril builds smart robotic systems and computer vision tools. Their towers and drones track vehicles and keep borders secure.',
      whyCool: 'Their software connects robots into a shared map. This gives security teams real-time awareness.',
      funFact: 'Engineers use rapid 3D printing to test new drone designs in just days.',
    },
  },
  FIGUREAI: {
    symbol: 'FIGUREAI',
    name: 'Figure AI',
    tagline: 'Friendly robots that walk on two legs',
    little: {
      whatTheyDo: 'Figure AI makes robots that walk on two legs. The robots have hands and arms. They help do hard jobs.',
      whyCool: 'The robots learn by watching. They can pick up boxes and carry tools.',
      funFact: 'Their robot can talk with you while handing you a fresh apple!',
    },
    big: {
      symbol: 'FIGUREAI',
      whatTheyDo: 'Figure AI builds humanoid robots for factories and warehouses. Their robots use neural networks to learn real-world movements and carry heavy loads.',
      whyCool: 'Humanoid robots fit into human spaces. They can use the same doors, stairs, and tools we use.',
      funFact: 'Figure robots practice tasks thousands of times in computer simulations before trying them in real life.',
    },
  },
  ANTHROPIC: {
    symbol: 'ANTHROPIC',
    name: 'Anthropic',
    tagline: 'Building helpful, honest, and kind AI friends',
    little: {
      whatTheyDo: 'Anthropic builds an AI helper named Claude. Claude is a smart computer helper. It answers questions and writes stories.',
      whyCool: 'The team teaches Claude to be kind and truthful. It never gives harmful advice.',
      funFact: 'Their safety rulebook is like a fair playground code!',
    },
    big: {
      symbol: 'ANTHROPIC',
      whatTheyDo: 'Anthropic is an AI research company that created Claude. Claude is a language model built with strong safety guardrails.',
      whyCool: 'They look inside neural networks to understand AI reasoning. This prevents deceptive or unsafe answers.',
      funFact: 'Claude can read a long textbook in seconds and summarize the main ideas.',
    },
  },
  OPENAI: {
    symbol: 'OPENAI',
    name: 'OpenAI',
    tagline: 'Teaching computers to think and solve puzzles',
    little: {
      whatTheyDo: 'OpenAI makes ChatGPT. It is a computer brain that chats. It can draw pictures and solve puzzles.',
      whyCool: 'You can ask it any question. It can explain science or help you invent fun games.',
      funFact: 'Their computers learned how to solve a Rubik’s cube using one robot hand.',
    },
    big: {
      symbol: 'OPENAI',
      whatTheyDo: 'OpenAI builds smart computer tools like ChatGPT. Their models learn from books, photos, and computer code. They help people research new ideas and create software.',
      whyCool: 'Their tools help scientists find new medicines and help engineers write code faster.',
      funFact: 'OpenAI was created to ensure artificial intelligence benefits all of humanity.',
    },
  },
  KALSHI: {
    symbol: 'KALSHI',
    name: 'Kalshi',
    tagline: 'Gathering clues to predict tomorrow',
    little: {
      whatTheyDo: 'Kalshi is a clue game. People make guesses about the future. They guess the weather or rocket launches.',
      whyCool: 'When many people share clues, the group answer is often very smart.',
      funFact: 'The word Kalshi means "everything" in Arabic.',
    },
    big: {
      symbol: 'KALSHI',
      whatTheyDo: 'Kalshi runs a market where people make predictions about the future. Members forecast changes in the economy, weather patterns, and science news.',
      whyCool: 'Prediction markets turn guesses into probabilities. These probabilities are often more accurate than single experts.',
      funFact: 'Weather forecasters and news teams use Kalshi data to measure public confidence.',
    },
  },
  POLYMARKET: {
    symbol: 'POLYMARKET',
    name: 'Polymarket',
    tagline: 'A world-wide market for clues and forecasts',
    little: {
      whatTheyDo: 'Polymarket is an idea board. People around the world vote on what will happen. It shows what people think.',
      whyCool: 'It changes when new facts arrive. It works like a live scoreboard for news.',
      funFact: 'It runs on Solana so the scoreboard is always open and fair.',
    },
    big: {
      symbol: 'POLYMARKET',
      whatTheyDo: 'Polymarket is a prediction market built on blockchain. Global participants buy and sell shares on future world events.',
      whyCool: 'All trades settle on-chain without central control. This keeps the market open and transparent.',
      funFact: 'Major news outlets report Polymarket odds to see how elections and tech races are tracking.',
    },
  },
  NEURALINK: {
    symbol: 'NEURALINK',
    name: 'Neuralink',
    tagline: 'Helping minds connect with technology',
    little: {
      whatTheyDo: 'Neuralink makes tiny computer chips. The chips help people who cannot move. They can play games using just their thoughts!',
      whyCool: 'A person thinks about a computer mouse. The arrow moves on the screen like magic.',
      funFact: 'The tiny chip wires are thinner than a single strand of hair.',
    },
    big: {
      symbol: 'NEURALINK',
      whatTheyDo: 'Neuralink builds brain-computer chips. Their tiny implants help people control computers using their minds. This gives patients their independence back.',
      whyCool: 'The chip reads brain signals and turns them into digital commands. This gives patients their digital independence back.',
      funFact: 'Trial patients have used the device to play chess and browse the web with mental intent.',
    },
  },
};

export interface LessonQuiz {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface Lesson {
  id: string;
  title: string;
  little: {
    summary: string;
    body: string;
  };
  big: {
    summary: string;
    body: string;
  };
  quiz: LessonQuiz[];
}

export const LESSONS: Lesson[] = [
  {
    id: 'save-vs-moon',
    title: 'Saving vs. Moon Jars',
    little: {
      summary: 'Your Save Jar keeps things safe. Your Moon Jar explores new ideas.',
      body: 'Your Save Jar holds digital dollars called USDC. One dollar stays one dollar, like coins in your piggy bank! Your Moon Jar takes a tiny slice of your savings to own pieces of cool companies. Those slices can grow over time, but they can also wiggle up and down.',
    },
    big: {
      summary: 'Balancing capital preservation with long-term technological upside.',
      body: 'The Save Jar acts as your stable cash reserve (denominated in USDC), protecting your principal. The Moon Jar allocates a strictly capped portion into tokenized shares of private technology companies, giving you exposure to innovation while shielding your core savings.',
    },
    quiz: [
      {
        question: 'What is inside the Save Jar?',
        options: ['Shiny rocks', 'Stable digital dollars (USDC)', 'Toy cars'],
        correctIndex: 1,
        explanation: 'The Save Jar holds digital dollars that stay steady!',
      },
      {
        question: 'Why does Moonjar limit how much goes into the Moon Jar?',
        options: ['Because keeping your main savings safe is the most important job', 'Because Pip gets tired', 'To make things harder'],
        correctIndex: 0,
        explanation: 'Safety first! Moonjar never puts more than your chosen cap into the Moon Jar.',
      },
      {
        question: 'Can the value in the Moon Jar wiggle up and down?',
        options: ['No, never', 'Yes, that is completely normal for companies', 'Only on Tuesdays'],
        correctIndex: 1,
        explanation: 'Yes! Company values move up and down as they build new things.',
      },
    ],
  },
  {
    id: 'ups-and-downs',
    title: 'Ups and Downs are Normal',
    little: {
      summary: 'Just like waves in the ocean, prices move gently up and down.',
      body: 'When a company builds a new rocket or creates a new robot, people get excited. Sometimes things take longer than expected, and prices dip. That is totally normal! Pip doesn’t panic on down days, and neither do we.',
    },
    big: {
      summary: 'Understanding market volatility and avoiding emotional reactions.',
      body: 'Private asset valuations and secondary token prices fluctuate with news, milestones, and liquidity. Market pullbacks are healthy and expected. Long-term value comes from real business execution, not day-to-day market sentiment.',
    },
    quiz: [
      {
        question: 'What does Pip do when prices are down today?',
        options: ['Panic and yell', 'Stay calm and keep an eye on things', 'Hide under a blanket'],
        correctIndex: 1,
        explanation: 'Pip stays calm! Dips are normal parts of building companies.',
      },
      {
        question: 'Why do prices wiggle?',
        options: ['Companies work on big challenges that take time', 'Magic spells', 'The computer is broken'],
        correctIndex: 0,
        explanation: 'Building rockets and robots is hard work, so progress comes in steps!',
      },
      {
        question: 'Should you check prices every two seconds?',
        options: ['Yes, all day long', 'No, patience lets ideas grow quietly', 'Only if Pip says so'],
        correctIndex: 1,
        explanation: 'Quiet patience is the secret superpower of good savers.',
      },
    ],
  },
  {
    id: 'what-is-private',
    title: 'What is a Private Company?',
    little: {
      summary: 'Some companies don’t sell their tickets to the public store yet.',
      body: 'You might know companies like Apple or Disney whose shares anyone can buy at the store. But companies like SpaceX or Anthropic are "private." PreStocks lets us hold a tiny digital slice of those private builders before everyone else!',
    },
    big: {
      summary: 'Pre-IPO companies and secondary tokenized exposure.',
      body: 'Private companies have not yet listed their stock on public stock exchanges (an IPO). PreStocks uses Special Purpose Vehicles (SPVs) on Solana to track the value of private shares 1:1, unlocking access typically reserved for venture funds.',
    },
    quiz: [
      {
        question: 'What does "private company" mean?',
        options: ['A secret club in a treehouse', 'A company not yet traded on public stock exchanges', 'A company that makes privacy curtains'],
        correctIndex: 1,
        explanation: 'Private companies are growing companies before their public IPO!',
      },
      {
        question: 'How does PreStocks work?',
        options: ['It tracks real private company shares 1:1 on Solana', 'It guesses random numbers', 'It sends paper coupons in the mail'],
        correctIndex: 0,
        explanation: 'PreStocks tokens track private company shares 1:1 on Solana.',
      },
      {
        question: 'Can you own a small slice of a private company with Moonjar?',
        options: ['No, only billionaires can', 'Yes, Moonjar makes tiny slices easy', 'Only if you visit their office'],
        correctIndex: 1,
        explanation: 'Yes! Moonjar lets kids own small slices safely.',
      },
    ],
  },
  {
    id: 'price-vs-value',
    title: 'Price vs. Estimated Value',
    little: {
      summary: 'Sometimes a sticker costs more than it is really worth!',
      body: 'Imagine your favorite trading card is worth $5, but someone at school asks for $10 because they really like it. That $10 is the market price, but the true value is still $5. Pip skips tokens when people are charging way too much!',
    },
    big: {
      summary: 'Evaluating premiums and why the keeper skips overpriced tokens.',
      body: 'PreStocks tokens trade in automated market maker pools where buyer demand can push the token price above the company’s latest funding valuation (mark price). When premiumPct exceeds +10%, Moonjar skips buying to protect you from overpaying.',
    },
    quiz: [
      {
        question: 'What is the "mark price"?',
        options: ['The price of a magic marker', 'The estimated underlying value of the company', 'The highest price in history'],
        correctIndex: 1,
        explanation: 'The mark price is what the company is estimated to be worth based on real funding!',
      },
      {
        question: 'Why did Pip skip buying Neuralink when it was 30% above its mark price?',
        options: ['Because it was too pricey right now!', 'Because Pip forgot', 'Because Pip doesn’t like brain chips'],
        correctIndex: 0,
        explanation: 'Pip never overpays! When a token is too pricey, we wait for a fair price.',
      },
      {
        question: 'What does "On sale" mean?',
        options: ['The company is closing down', 'The token price is lower than its estimated value', 'A 50% off coupon code'],
        correctIndex: 1,
        explanation: 'On sale means the token trades at a discount to its estimated valuation!',
      },
    ],
  },
  {
    id: 'what-is-a-slice',
    title: 'What a "Slice" Means',
    little: {
      summary: 'Think of a giant delicious pizza cut into a million tiny bites.',
      body: 'You don’t need to buy a whole rocket to be part of the adventure! With Moonjar, you own a tiny slice. Even if you own 0.01 of a share, you are an owner of that adventure.',
    },
    big: {
      summary: 'Fractional ownership powered by high-precision tokens.',
      body: 'On Solana, SPL tokens support fractional precision up to 9 decimal places. This allows a child’s vault to allocate $2.50 or $5 into high-value shares like Anthropic ($1,000+) without needing thousands of dollars upfront.',
    },
    quiz: [
      {
        question: 'Do you need to buy a whole company to own a piece of it?',
        options: ['Yes, you must buy the whole building', 'No, you can own a fractional slice', 'You have to work there first'],
        correctIndex: 1,
        explanation: 'You can own a fractional slice, just like a single bite of pizza!',
      },
      {
        question: 'How do fractions work on Solana?',
        options: ['Tokens can be divided into tiny decimal parts', 'Coins are cut with scissors', 'Tokens cannot be divided'],
        correctIndex: 0,
        explanation: 'Tokens are divisible into tiny pieces so anyone can participate.',
      },
      {
        question: 'If you own a slice of SpaceX, what are you?',
        options: ['An astronaut right now', 'A partial owner participating in the rocket journey', 'A rocket pilot'],
        correctIndex: 1,
        explanation: 'You hold a real economic slice of the journey!',
      },
    ],
  },
  {
    id: 'patience-and-time',
    title: 'Patience and Time',
    little: {
      summary: 'The biggest oak trees start as tiny acorns in the soil.',
      body: 'Saving isn’t a race. It’s like planting a little seed in your garden. When grandparents send a birthday gift, or your guardian adds spare change, your jars fill little by little. Over years, those drops add up to a big ocean!',
    },
    big: {
      summary: 'The compound effect of consistent deposits and long horizons.',
      body: 'Long-term wealth is built through dollar-cost averaging and patience. By making small, regular additions through round-ups and family gifts over 5 to 15 years, young savers benefit from the compounding trajectory of frontier industries.',
    },
    quiz: [
      {
        question: 'What is the secret superpower of saving?',
        options: ['Racing as fast as possible', 'Patience, time, and small steady steps', 'Checking every minute'],
        correctIndex: 1,
        explanation: 'Small steady steps over time create amazing gardens!',
      },
      {
        question: 'How do family gift links help?',
        options: ['Relatives can add directly into your Save Jar for birthdays or milestones', 'They send annoying spam emails', 'They take money out'],
        correctIndex: 0,
        explanation: 'Family members can send gifts directly into your jar with one tap.',
      },
      {
        question: 'What happens on Graduation Day?',
        options: ['The app deletes everything', 'You receive full custody of your vault and keys as an adult', 'Pip goes on vacation forever'],
        correctIndex: 1,
        explanation: 'On Graduation Day, you receive your keys and step into self-custody!',
      },
    ],
  },
];

export const PIP_MESSAGES = {
  welcome: [
    'Hi friend! Pip is here watching over your jars.',
    'Welcome back! Your jars are resting peacefully.',
    'Look at your little financial garden grow!',
  ],
  skippedTooPricey: (name: string, premiumPct: number) =>
    `Pip skipped ${name} today. It’s trading ${Math.round(premiumPct)}% above its estimated value. We never overpay!`,
  boughtOnSale: (name: string, discountPct: number) =>
    `Great find! Pip spotted ${name} trading at a ${Math.abs(Math.round(discountPct))}% discount, so we added a slice today.`,
  depositCelebration: (amount: number) =>
    `Hooray! $${amount} just hopped into your Save Jar!`,
  calmDownDay: 'A few companies dipped today. Remember: big ideas take time to build. Pip is calm!',
};
