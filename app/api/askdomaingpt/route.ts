import { ChatGPTAPI } from 'chatgpt';
import whois from 'whois-json';
import * as z from 'zod';

const domainRequestSchema = z.object({
  prompt: z.string(),
});

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const body = domainRequestSchema.parse(json);

    const chatGPTResponse = await getChatGPTResponse(body.prompt);
    const availableDomains = await checkDomainAvailability(chatGPTResponse);

    return new Response(JSON.stringify({ availableDomains }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify(error.issues), { status: 422 });
    }

    console.error(error);
    return new Response(JSON.stringify({ message: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

const getChatGPTResponse = async (prompt: string) => {
  const apiClient = new ChatGPTAPI({ apiKey: process.env.OPENAI_API_KEY! });
  const response = await apiClient.sendMessage(`Suggest domain names for a company that ${prompt}`);
  return response.text.split('\n');
};

const checkDomainAvailability = async (domains: string[]) => {
  let availableDomains = [];

  for (let domain of domains) {
    const domainName = domain.split(' ')[1]?.replace(/,/g, '');
    if (domainName) {
      try {
        const domainInfo = await whois(domainName, { follow: 3, timeout: 3000 });
        if (!domainInfo.hasOwnProperty('domainName')) {
          availableDomains.push(domainName);
        }
      } catch (e) {
        console.log(`Error checking availability for ${domainName}: ${e}`);
      }
    }
  }

  return availableDomains;
};
