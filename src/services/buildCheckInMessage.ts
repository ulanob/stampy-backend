import type { NotifiableCard } from './notification-eligibility';

export type CheckInMessage = { subject: string; body: string };

function describeCard(notifiable: NotifiableCard): { noun: string; detail: string } {
  if (notifiable.type === 'gift_card') {
    const { currency, current_balance } = notifiable.card;
    const amount = new Intl.NumberFormat('en-CA', { style: 'currency', currency }).format(
      current_balance,
    );
    return { noun: 'gift card', detail: `with ${amount}` };
  }

  const { status, stamps_acquired, stamps_needed } = notifiable.card;
  return {
    noun: 'stamp card',
    detail:
      status === 'completed'
        ? 'ready to be redeemed'
        : `with ${stamps_acquired}/${stamps_needed} stamps`,
  };
}

// Identical descriptions collapse into a count ("2 stamp cards ready to be redeemed").
export function buildCheckInMessage(eligible: NotifiableCard[]): CheckInMessage {
  const groups = new Map<string, { noun: string; detail: string; count: number }>();

  for (const notifiable of eligible) {
    const description = describeCard(notifiable);
    const key = `${description.noun}|${description.detail}`;
    const existing = groups.get(key);
    if (existing) existing.count++;
    else groups.set(key, { ...description, count: 1 });
  }

  const body = [...groups.values()]
    .map(({ noun, detail, count }) => `${count} ${noun}${count > 1 ? 's' : ''} ${detail}`)
    .join(' / ');

  return { subject: 'You have cards nearby', body };
}
