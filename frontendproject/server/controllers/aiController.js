const fallbackResponse = (message) => {
  const normalizedMessage = message.toLowerCase();

  if (normalizedMessage.includes('request') || normalizedMessage.includes('start')) {
    return 'Log in to your account, go to My Clearance, select Request Clearance, complete the required information, and submit the request. It will then go through HR review and the required clearance offices.';
  }

  if (normalizedMessage.includes('finance') || normalizedMessage.includes('return')) {
    return 'The system will show the office return reason. Correct the required information and resubmit the request according to the clearance workflow.';
  }

  if (normalizedMessage.includes('status') || normalizedMessage.includes('track')) {
    return 'Open My Clearance after signing in to see the current status of HR, Department, Finance, Library, Property, and ICT reviews.';
  }

  if (normalizedMessage.includes('certificate')) {
    return 'After all required offices approve your clearance, HR completes the final review and makes the certificate available under My Certificates.';
  }

  return 'I can help with clearance requests, clearance status, Finance, Library, Property, ICT reviews, returned requests, and certificate downloads. What would you like to know?';
};

const systemPrompt = `You are the Bahir Dar University Employee Clearance Assistant. Answer only questions related to the university employee clearance system and its workflow. Be concise, clear, and practical. The workflow is: employee submits a request, HR reviews it, Department Head reviews it, Finance, Library, Property/Asset, and ICT review it as required, then HR performs final review and issues the certificate. If a question is outside this scope, politely say that you can only help with employee clearance support. Never invent personal clearance status or claim to access an employee account.`;

export const chatWithAssistant = async (req, res) => {
  const { message, history = [] } = req.body;

  if (typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ message: 'A message is required.' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.json({ reply: fallbackResponse(message), source: 'help-center' });
  }

  const safeHistory = Array.isArray(history)
    ? history
        .filter((item) => item && ['user', 'assistant'].includes(item.role) && typeof item.content === 'string')
        .slice(-8)
        .map(({ role, content }) => ({ role, content: content.slice(0, 2000) }))
    : [];

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        temperature: 0.2,
        max_tokens: 300,
        messages: [
          { role: 'system', content: systemPrompt },
          ...safeHistory,
          { role: 'user', content: message.trim().slice(0, 2000) },
        ],
      }),
    });

    if (!response.ok) {
      console.error('OpenAI request failed:', response.status, await response.text());
      return res.json({ reply: fallbackResponse(message), source: 'help-center' });
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content?.trim();
    return res.json({ reply: reply || fallbackResponse(message), source: 'assistant' });
  } catch (error) {
    console.error('AI assistant error:', error.message);
    return res.json({ reply: fallbackResponse(message), source: 'help-center' });
  }
};
