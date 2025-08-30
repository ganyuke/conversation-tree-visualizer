/** CONFIG */
export const NODE_W = 260;   // card width in px (keep in sync with CSS)
export const NODE_H = 120;   // virtual height used for layout spacing
export const NODE_H_GAP = 30; // extra space between siblings
export const H_GAP = 80;    // horizontal gap between columns
export const V_GAP = 36;    // vertical gap within column (link curvature)

/** SAMPLE DATA */
export const data = {
    speaker: 'user',
    text: 'Plan me a weekend in Tokyo. I like food and tech.',
    timestamp: '2025-08-10 09:12',
    children: [
        {
            speaker: 'assistant',
            text: 'Great! Do you prefer street food crawls or Michelin-tier experiences? I can also weave in Akihabara and TeamLab.',
            timestamp: '2025-08-10 09:12',
            children: [
                {
                    speaker: 'user',
                    text: 'Street food, lots of walking. Keep it cheap.',
                    timestamp: '2025-08-10 09:13',
                    children: [
                        {
                            speaker: 'assistant',
                            text: 'Copy! Here are three sample routes for day 1 with yakitori alleys, ramen counters, and a retro arcade stop.',
                            timestamp: '2025-08-10 09:13'
                        },
                        {
                            speaker: 'assistant',
                            text: 'Alt plan: Tsukiji outer market early, Asakusa snack crawl, Ueno park stroll, and Akihabara retro. (Click to expand for details...)',
                            timestamp: '2025-08-10 09:14'
                        }
                    ]
                },
                {
                    speaker: 'user',
                    text: 'Michelin please — tasting menus are fine.',
                    timestamp: '2025-08-10 09:13',
                    children: [
                        {
                            speaker: 'assistant',
                            text: 'Understood. I can propose 2× tasting menus and a coffee omakase, with exhibit/bookstore stops between.',
                            timestamp: '2025-08-10 09:14'
                        }
                    ]
                }
            ]
        },
        {
            speaker: 'assistant',
            text: 'Here is a cost-sensitive itinerary with public transit optimizations and some gadget stops.',
            timestamp: '2025-08-10 09:12'
        }
    ]
};
