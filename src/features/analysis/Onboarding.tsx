import { ButtonLink } from '@/components/ui/Button';
import type { GuideStep } from '@/lib/types';

type OnboardingProps = { daysLeft: number | null; steps: readonly GuideStep[]; startHref: string };

export function Onboarding({ daysLeft, steps, startHref }: OnboardingProps) {
  return (
    <section className="panel pad stack-sm">
      <h2 className="h2">How to use the next {daysLeft && daysLeft > 0 ? `${daysLeft} day${daysLeft === 1 ? '' : 's'}` : 'few days'}</h2>
      <ol className="steps">
        {steps.map((step) => (
          <li key={step.title}>
            <span>
              <b>{step.title}</b>
              <span className="muted small">{step.note}</span>
            </span>
          </li>
        ))}
      </ol>
      <div className="row-actions">
        <ButtonLink href={startHref} variant="primary">
          {startHref === '#mocks' ? 'Start with a full set' : 'Start practising'}
        </ButtonLink>
        <ButtonLink href={startHref === '#mocks' ? '#bank' : '#mocks'}>{startHref === '#mocks' ? 'Practise by topic' : 'Take a mock'}</ButtonLink>
      </div>
    </section>
  );
}
