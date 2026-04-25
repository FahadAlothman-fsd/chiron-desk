import { neon } from "@neondatabase/serverless";

export type SurveyStatus = "eligible" | "snoozed" | "dismissed" | "clicked" | "completed";

export type SurveyRecord = {
  experimentId: string;
  surveyVersion: string;
  emailHash: string;
  participantRef: string;
  status: SurveyStatus;
  firstPromptedAt?: string;
  lastPromptedAt?: string;
  clickedAt?: string;
  snoozedAt?: string;
  dismissedAt?: string;
  completedAt?: string;
  lastEligibleTransitionExecutionId?: string;
  installId?: string;
  lastSnoozedSessionId?: string;
  providerResponseId?: string;
};

type SurveyRecordRow = {
  experiment_id: string;
  survey_version: string;
  email_hash: string;
  participant_ref: string;
  status: SurveyStatus;
  first_prompted_at: string | null;
  last_prompted_at: string | null;
  clicked_at: string | null;
  snoozed_at: string | null;
  dismissed_at: string | null;
  completed_at: string | null;
  last_eligible_transition_execution_id: string | null;
  install_id: string | null;
  last_snoozed_session_id: string | null;
  provider_response_id: string | null;
};

let initialized = false;

function getSql() {
  const databaseUrl = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;

  if (!databaseUrl) {
    throw new Error("Missing DATABASE_URL or POSTGRES_URL for survey persistence.");
  }

  return neon(databaseUrl);
}

function toRecord(row: SurveyRecordRow): SurveyRecord {
  return {
    experimentId: row.experiment_id,
    surveyVersion: row.survey_version,
    emailHash: row.email_hash,
    participantRef: row.participant_ref,
    status: row.status,
    firstPromptedAt: row.first_prompted_at ?? undefined,
    lastPromptedAt: row.last_prompted_at ?? undefined,
    clickedAt: row.clicked_at ?? undefined,
    snoozedAt: row.snoozed_at ?? undefined,
    dismissedAt: row.dismissed_at ?? undefined,
    completedAt: row.completed_at ?? undefined,
    lastEligibleTransitionExecutionId: row.last_eligible_transition_execution_id ?? undefined,
    installId: row.install_id ?? undefined,
    lastSnoozedSessionId: row.last_snoozed_session_id ?? undefined,
    providerResponseId: row.provider_response_id ?? undefined,
  };
}

async function ensureSurveyTable() {
  if (initialized) {
    return;
  }

  const sql = getSql();
  await sql`
    create table if not exists survey_participants (
      id text primary key,
      experiment_id text not null,
      survey_version text not null,
      email_hash text not null,
      participant_ref text not null,
      status text not null,
      first_prompted_at timestamptz,
      last_prompted_at timestamptz,
      clicked_at timestamptz,
      snoozed_at timestamptz,
      dismissed_at timestamptz,
      completed_at timestamptz,
      last_eligible_transition_execution_id text,
      install_id text,
      last_snoozed_session_id text,
      provider_response_id text,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      unique (experiment_id, email_hash),
      unique (experiment_id, participant_ref)
    )
  `;
  initialized = true;
}

export async function upsertSurveyRecord(record: SurveyRecord): Promise<SurveyRecord> {
  await ensureSurveyTable();
  const sql = getSql();
  const [row] = await sql<SurveyRecordRow[]>`
    insert into survey_participants (
      id,
      experiment_id,
      survey_version,
      email_hash,
      participant_ref,
      status,
      first_prompted_at,
      last_prompted_at,
      clicked_at,
      snoozed_at,
      dismissed_at,
      completed_at,
      last_eligible_transition_execution_id,
      install_id,
      last_snoozed_session_id,
      provider_response_id
    ) values (
      ${`${record.experimentId}:${record.emailHash}`},
      ${record.experimentId},
      ${record.surveyVersion},
      ${record.emailHash},
      ${record.participantRef},
      ${record.status},
      ${record.firstPromptedAt ?? null},
      ${record.lastPromptedAt ?? null},
      ${record.clickedAt ?? null},
      ${record.snoozedAt ?? null},
      ${record.dismissedAt ?? null},
      ${record.completedAt ?? null},
      ${record.lastEligibleTransitionExecutionId ?? null},
      ${record.installId ?? null},
      ${record.lastSnoozedSessionId ?? null},
      ${record.providerResponseId ?? null}
    )
    on conflict (experiment_id, email_hash) do update set
      survey_version = excluded.survey_version,
      participant_ref = excluded.participant_ref,
      status = case
        when survey_participants.status = 'completed' then survey_participants.status
        else excluded.status
      end,
      first_prompted_at = coalesce(survey_participants.first_prompted_at, excluded.first_prompted_at),
      last_prompted_at = coalesce(excluded.last_prompted_at, survey_participants.last_prompted_at),
      clicked_at = coalesce(excluded.clicked_at, survey_participants.clicked_at),
      snoozed_at = coalesce(excluded.snoozed_at, survey_participants.snoozed_at),
      dismissed_at = coalesce(excluded.dismissed_at, survey_participants.dismissed_at),
      completed_at = coalesce(survey_participants.completed_at, excluded.completed_at),
      last_eligible_transition_execution_id = coalesce(excluded.last_eligible_transition_execution_id, survey_participants.last_eligible_transition_execution_id),
      install_id = coalesce(excluded.install_id, survey_participants.install_id),
      last_snoozed_session_id = coalesce(excluded.last_snoozed_session_id, survey_participants.last_snoozed_session_id),
      provider_response_id = coalesce(excluded.provider_response_id, survey_participants.provider_response_id),
      updated_at = now()
    returning *
  `;

  return toRecord(row);
}

export async function getSurveyRecord(
  experimentId: string,
  emailHash: string,
): Promise<SurveyRecord | undefined> {
  await ensureSurveyTable();
  const sql = getSql();
  const [row] = await sql<SurveyRecordRow[]>`
    select * from survey_participants
    where experiment_id = ${experimentId} and email_hash = ${emailHash}
    limit 1
  `;

  return row ? toRecord(row) : undefined;
}

export async function markSurveyClicked(
  experimentId: string,
  emailHash: string,
): Promise<SurveyRecord | undefined> {
  await ensureSurveyTable();
  const sql = getSql();
  const [row] = await sql<SurveyRecordRow[]>`
    update survey_participants
    set status = 'clicked', clicked_at = coalesce(clicked_at, now()), updated_at = now()
    where experiment_id = ${experimentId}
      and email_hash = ${emailHash}
      and status not in ('completed', 'dismissed')
    returning *
  `;

  return row ? toRecord(row) : undefined;
}

export async function markSurveySnoozed(
  experimentId: string,
  emailHash: string,
  sessionId: string,
): Promise<SurveyRecord | undefined> {
  await ensureSurveyTable();
  const sql = getSql();
  const [row] = await sql<SurveyRecordRow[]>`
    update survey_participants
    set status = 'snoozed', snoozed_at = now(), last_snoozed_session_id = ${sessionId}, updated_at = now()
    where experiment_id = ${experimentId}
      and email_hash = ${emailHash}
      and status not in ('completed', 'dismissed')
    returning *
  `;

  return row ? toRecord(row) : undefined;
}

export async function markSurveyDismissed(
  experimentId: string,
  emailHash: string,
): Promise<SurveyRecord | undefined> {
  await ensureSurveyTable();
  const sql = getSql();
  const [row] = await sql<SurveyRecordRow[]>`
    update survey_participants
    set status = 'dismissed', dismissed_at = now(), updated_at = now()
    where experiment_id = ${experimentId}
      and email_hash = ${emailHash}
      and status != 'completed'
    returning *
  `;

  return row ? toRecord(row) : undefined;
}

export async function markSurveyCompleted(
  experimentId: string,
  participantRef: string,
  providerResponseId: string,
): Promise<SurveyRecord | undefined> {
  await ensureSurveyTable();
  const sql = getSql();
  const [row] = await sql<SurveyRecordRow[]>`
    update survey_participants
    set status = 'completed', completed_at = coalesce(completed_at, now()), provider_response_id = ${providerResponseId}, updated_at = now()
    where experiment_id = ${experimentId} and participant_ref = ${participantRef}
    returning *
  `;

  return row ? toRecord(row) : undefined;
}
