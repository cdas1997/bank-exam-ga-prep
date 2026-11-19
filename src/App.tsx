import { useEffect } from 'react';
import { SiteHeader, type Section } from '@/components/layout/SiteHeader';
import { EXAMS, examByKey } from '@/data';
import { AnalysisPage } from '@/features/analysis';
import { LoginPage } from '@/features/auth';
import { BankPage, QuestionSetPage } from '@/features/bank';
import { ExamPickerPage } from '@/features/exams';
import { MockReview, MocksPage, RunningMock } from '@/features/mocks';
import { QaPage } from '@/features/qa';
import { navigate, parseRoute, useHash, type Route } from '@/hooks/useHashRoute';
import { useNow } from '@/hooks/useNow';
import { attemptNumber } from '@/lib/analysis';
import { examPhase, phaseLabel } from '@/lib/dates';
import { isLiveRunning } from '@/lib/mock';
import { setStats } from '@/lib/scoring';
import type { Exam, ExamKey } from '@/lib/types';
import { profileStore, useProfileState } from '@/store/profileStore';

const MINUTE = 60_000;

function sectionOf(route: Route): Section {
  if (route.name === 'bank' || route.name === 'set') return 'bank';
  if (route.name === 'mocks' || route.name === 'review' || route.name === 'mock') return 'mocks';
  if (route.name === 'qa') return 'qa';
  return 'analysis';
}

function handlePickExam(examKey: ExamKey): void {
  profileStore.selectExam(examKey);
  navigate({ name: 'analysis' });
  window.scrollTo(0, 0);
}

export function App() {
  const hash = useHash();
  const route = parseRoute(hash);
  const user = useProfileState((s) => s.user);
  const exam = examByKey(useProfileState((s) => s.examKey));
  const profile = useProfileState((s) => s.profile);
  const storageOk = useProfileState((s) => s.storageOk);
  const now = useNow(MINUTE);
  const live = profile.live;
  const liveExpired = live !== null && live.endsAt <= now;
  const showRunning = route.name === 'mock' && isLiveRunning(live, now);
  const inCourse = Boolean(user && exam);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [hash]);

  useEffect(() => {
    if (liveExpired) profileStore.finishLive();
  }, [liveExpired]);

  useEffect(() => {
    if (inCourse && route.name === 'mock' && !showRunning) navigate({ name: 'mocks' });
  }, [inCourse, route.name, showRunning]);

  if (!user) return <LoginPage exams={EXAMS} onLogin={(name) => profileStore.login(name)} />;

  if (!exam) {
    return <ExamPickerPage exams={EXAMS} user={user} now={now} onPick={handlePickExam} onSwitchUser={() => profileStore.logout()} />;
  }

  if (showRunning && live) return <RunningMock bank={exam.bank} live={live} />;

  const phase = examPhase(exam.bank.examDate, exam.endDate, now);

  return (
    <div className="with-tabs with-head">
      <SiteHeader
        active={sectionOf(route)}
        brand={exam.brand}
        countdown={phase && phase.kind !== 'after' ? phaseLabel(phase) : null}
        user={user}
        onSwitchExam={() => profileStore.leaveExam()}
        onSwitchUser={() => profileStore.logout()}
      />
      <Page route={route} exam={exam} user={user} now={now} storageOk={storageOk} />
    </div>
  );
}

type PageProps = { route: Route; exam: Exam; user: string; now: number; storageOk: boolean };

function Page({ route, exam, user, now, storageOk }: PageProps) {
  const profile = useProfileState((s) => s.profile);
  const mocksPage = <MocksPage exam={exam} answeredCount={setStats(exam.bank.all, profile.answers).done} mocks={profile.mocks} live={profile.live} />;
  switch (route.name) {
    case 'bank':
      return <BankPage exam={exam} answers={profile.answers} mode={profile.mode} />;
    case 'set':
      return <QuestionSetPage key={`${route.key}~${route.filter}`} exam={exam} setKey={route.key} initialFilter={route.filter} answers={profile.answers} mode={profile.mode} />;
    case 'mocks':
    case 'mock':
      return mocksPage;
    case 'review': {
      const mock = profile.mocks.find((m) => m.id === route.id);
      if (!mock) return mocksPage;
      return <MockReview key={mock.id} exam={exam} mock={mock} attempt={attemptNumber(mock, profile.mocks)} canStartNew={!isLiveRunning(profile.live, now)} />;
    }
    case 'qa':
      return <QaPage exam={exam} categoryKey={route.key} />;
    case 'analysis':
      return <AnalysisPage exam={exam} user={user} profile={profile} storageOk={storageOk} now={now} />;
  }
}
