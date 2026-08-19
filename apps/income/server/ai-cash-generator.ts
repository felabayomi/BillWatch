import OpenAI from 'openai';

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface UserAnswers {
  needCashBy?: string;
  freeHours?: string;
  transport?: string;
  peopleComfort?: string;
  itemsToSell?: boolean;
  heavyLifting?: boolean;
  indoorPreferred?: boolean;
  onlineTasksOk?: boolean;
  skills?: string[];
  assets?: string[];
  locationType?: string;
}

interface AIOpportunity {
  title: string;
  description: string;
  category: string;
  earningsMin: number;
  earningsMax: number;
  payoutSpeed: string;
  timeRequired: string;
  requires: {
    transport: string;
    people: string;
    heavy: boolean;
    indoor: boolean;
  };
  fits: {
    skillsAny: string[];
    assetsAny: string[];
    locationAny: string[];
    onlineOk: boolean;
  };
  howToStart: string[];
  notes?: string;
}

export class AICashGenerator {
  private buildSystemPrompt(): string {
    return `You are the AI brain behind IncomeLift, a cutting-edge income opportunity generator.

CORE PHILOSOPHY:
• Bills don't wait - focus on immediate income, not long-term business ideas
• Practical over aspirational - real opportunities people can start TODAY
• Math-based approach - realistic earnings based on time/effort
• Dignity-preserving - legitimate opportunities, never desperate schemes
• Action-oriented - specific steps, not vague advice

OPPORTUNITY CATEGORIES:
• resale: Flipping items, selling possessions, marketplace arbitrage
• services: Direct services to people (cleaning, delivery, handyman, etc.)
• digital: Online work, virtual assistance, content creation, apps
• gig_work: Platform-based work (rideshare, delivery apps, freelance platforms)

EARNINGS PHILOSOPHY:
• Conservative estimates - better to under-promise and over-deliver
• Time-to-payment focus: "today" = same day, "3days" = 3 business days, "7days" = within a week
• Real market rates - research actual pay for suggested activities
• Account for taxes, fees, expenses in estimates

CONSTRAINT RESPECT:
• Transport: none/bicycle/car/van - never suggest what they can't do
• People comfort: low/medium/high - respect social anxiety and preferences
• Physical limits: heavy lifting yes/no, indoor/outdoor preferences
• Time availability: match suggestions to available hours
• Skills/assets: build on what they already have

YOUR TASK:
Generate 3-5 personalized income opportunities that:
1. Can be started within their timeline
2. Fit their exact constraints and capabilities
3. Provide realistic earnings for their available time
4. Include specific, actionable steps to get started
5. Follow IncomeLift's practical, no-nonsense style

FORMAT: Return valid JSON array of opportunities matching the schema provided.`;
  }

  private buildUserPrompt(answers: UserAnswers): string {
    const constraints = [];
    if (answers.transport) constraints.push(`Transport: ${answers.transport}`);
    if (answers.freeHours) constraints.push(`Available time: ${answers.freeHours}`);
    if (answers.peopleComfort) constraints.push(`People comfort: ${answers.peopleComfort}`);
    if (answers.needCashBy) constraints.push(`Timeline: needs money in ${answers.needCashBy}`);
    
    const preferences = [];
    if (answers.heavyLifting === false) preferences.push("No heavy lifting");
    if (answers.indoorPreferred === true) preferences.push("Prefers indoor work");
    if (answers.onlineTasksOk === true) preferences.push("Open to online tasks");
    if (answers.itemsToSell === true) preferences.push("Has items to sell");

    const skills = answers.skills?.length ? `Skills: ${answers.skills.join(', ')}` : 'Skills: general/willing to learn';
    const assets = answers.assets?.length ? `Assets available: ${answers.assets.join(', ')}` : 'Assets: basic items most people have';
    
    return `GENERATE INCOME OPPORTUNITIES FOR:
    
CONSTRAINTS: ${constraints.join(' • ')}
PREFERENCES: ${preferences.join(' • ')}
${skills}
${assets}
Location type: ${answers.locationType || 'suburban'}

Generate 3-5 specific, actionable opportunities this person can pursue immediately. Focus on creative combinations of their skills/assets/constraints that others might miss. Be innovative but practical.

Each opportunity MUST have:
- A SPECIFIC, descriptive title (not generic like "Quick Cash Opportunity")
- Realistic earning range for their available time
- Specific steps to get started today
- Proper categorization (resale/services/digital/gig_work)
- Accurate constraint matching

Example good titles: "Dog Walking Service", "Facebook Marketplace Furniture Flipping", "Virtual Assistant for Small Businesses", "Grocery Shopping Service"

Return ONLY a valid JSON array of opportunities with descriptive titles.`;
  }

  async generateOpportunities(answers: UserAnswers): Promise<AIOpportunity[]> {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: this.buildSystemPrompt()
          },
          {
            role: "user", 
            content: this.buildUserPrompt(answers)
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 2000
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from AI');
      }

      const result = JSON.parse(content);
      
      // Handle both array format and object with opportunities array
      const opportunities = Array.isArray(result) ? result : (result.opportunities || []);
      
      return opportunities.slice(0, 5).map((opp: any) => ({
        title: opp.title && opp.title !== 'Quick Cash Opportunity' ? opp.title : `${opp.category === 'services' ? 'Local Service' : opp.category === 'digital' ? 'Online Task' : opp.category === 'resale' ? 'Item Resale' : 'Gig Work'} Opportunity`,
        description: opp.description || '',
        category: opp.category || 'services',
        earningsMin: Math.max(10, parseInt(opp.earningsMin) || 20),
        earningsMax: Math.max(20, parseInt(opp.earningsMax) || 100),
        payoutSpeed: opp.payoutSpeed || '3days',
        timeRequired: opp.timeRequired || '2-3h',
        requires: {
          transport: opp.requires?.transport || 'none',
          people: opp.requires?.people || 'medium',
          heavy: Boolean(opp.requires?.heavy),
          indoor: Boolean(opp.requires?.indoor)
        },
        fits: {
          skillsAny: Array.isArray(opp.fits?.skillsAny) ? opp.fits.skillsAny : ['general'],
          assetsAny: Array.isArray(opp.fits?.assetsAny) ? opp.fits.assetsAny : ['basic'],
          locationAny: Array.isArray(opp.fits?.locationAny) ? opp.fits.locationAny : ['suburban', 'urban'],
          onlineOk: Boolean(opp.fits?.onlineOk)
        },
        howToStart: Array.isArray(opp.howToStart) ? opp.howToStart : ['Contact local services', 'Set up basic equipment', 'Start with friends and neighbors'],
        notes: opp.notes || null
      }));
      
    } catch (error) {
      console.error('AI Cash Generation Error:', error);
      
      // Fallback: Generate basic opportunity based on user constraints
      return this.generateFallbackOpportunity(answers);
    }
  }

  private generateFallbackOpportunity(answers: UserAnswers): AIOpportunity[] {
    // Smart fallback based on user's actual inputs
    const hasTransport = answers.transport === 'car' || answers.transport === 'van';
    const hasDigitalSkills = answers.skills?.includes('digital') || answers.skills?.includes('tech');
    const isComfortableWithPeople = answers.peopleComfort === 'high' || answers.peopleComfort === 'medium';
    const hasSpareRoom = answers.assets?.includes('spareRoom');
    
    const opportunities: AIOpportunity[] = [];
    
    // Transport-based opportunities
    if (hasTransport) {
      opportunities.push({
        title: 'Local Delivery Service',
        description: 'Provide delivery services for local businesses or individuals in your area',
        category: 'services',
        earningsMin: 15,
        earningsMax: 25,
        payoutSpeed: 'today',
        timeRequired: '3-5h',
        requires: { transport: answers.transport || 'car', people: 'low', heavy: false, indoor: false },
        fits: { skillsAny: ['driving'], assetsAny: ['car', 'van'], locationAny: ['suburban', 'urban'], onlineOk: false },
        howToStart: ['Check local Facebook groups', 'Contact small restaurants', 'Sign up for local delivery apps', 'Post on neighborhood apps']
      });
    }
    
    // Digital opportunities  
    if (hasDigitalSkills) {
      opportunities.push({
        title: 'Virtual Assistant Tasks',
        description: 'Help businesses with online tasks, data entry, and administrative support',
        category: 'digital',
        earningsMin: 12,
        earningsMax: 20,
        payoutSpeed: '3days',
        timeRequired: '2-4h',
        requires: { transport: 'none', people: 'low', heavy: false, indoor: true },
        fits: { skillsAny: ['digital', 'computer'], assetsAny: ['computer', 'internet'], locationAny: ['anywhere'], onlineOk: true },
        howToStart: ['Sign up on Upwork or Fiverr', 'Check Belay or Time Etc', 'Reach out to local small businesses', 'Offer social media management']
      });
    }
    
    // Room-based opportunities
    if (hasSpareRoom) {
      opportunities.push({
        title: 'Room Rental Service',
        description: 'Rent out your spare room to travelers or temporary workers',
        category: 'services',
        earningsMin: 40,
        earningsMax: 100,
        payoutSpeed: 'today',
        timeRequired: '1-2h',
        requires: { transport: 'none', people: 'medium', heavy: false, indoor: true },
        fits: { skillsAny: ['hosting'], assetsAny: ['spareRoom'], locationAny: ['suburban', 'urban'], onlineOk: false },
        howToStart: ['List on Airbnb or VRBO', 'Post on local Facebook groups', 'Contact nearby companies for worker housing', 'Check university housing boards']
      });
    }
    
    // General service opportunity
    if (isComfortableWithPeople) {
      opportunities.push({
        title: 'Task-Based Services',
        description: 'Help neighbors with simple tasks like organizing, light cleaning, or errands',
        category: 'services',
        earningsMin: 15,
        earningsMax: 30,
        payoutSpeed: 'today',
        timeRequired: '2-3h',
        requires: { transport: answers.transport || 'none', people: 'medium', heavy: false, indoor: true },
        fits: { skillsAny: ['cleaning', 'organizing'], assetsAny: ['basic'], locationAny: ['suburban', 'urban'], onlineOk: false },
        howToStart: ['Post on Nextdoor app', 'Ask friends and family', 'Check TaskRabbit', 'Offer services to elderly neighbors']
      });
    }
    
    return opportunities.slice(0, 3);
  }
}

export const aiCashGenerator = new AICashGenerator();