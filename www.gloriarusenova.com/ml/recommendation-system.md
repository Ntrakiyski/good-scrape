---
title: "Studio — AI Web Design"
url: "https://www.gloriarusenova.com/ml/recommendation-system"
---

## Where naive recommendation rollouts fail

Most shoppers never scroll far. When suggestions feel arbitrary—or when nobody can explain why the ranking changed last week—confidence in the product drops faster than any single bad recommendation. The business question is not only “turn on recommendations,” but how to keep relevance for loyal shoppers, behave sensibly for new or thin profiles, and ship updates without silent regressions.

The narrative tension

Thin histories & cold starts

Irrelevant ranks

Trust fades

Governed data · hybrid models · quality gates · logs

Safer relevance & accountable change

Sparse signals and cold-start gaps erode trust; the program offsets that with governance, blending strategies, explicit promotion rules, and telemetry—not with a one-off model notebook.

## Why a recommendation system

Collaborative filtering alone struggles when histories are short and catalogs are small. This initiative treats recommendations as a lifecycle: data that stays trustworthy, features that register as contracts, models that declare how cold-start is handled, and deployment paths that refuse to ship obvious ranking regressions.

## Showcase scale

The reference dataset is intentionally modest—enough to expose sparsity rather than hide it. The bars below use a logarithmic vertical scale so both the catalog counts and the larger historical interaction volume stay readable on one chart; exact figures match the executive technical review.

Recorded entity and event counts

Users **50**, products **80**, recent interactions **251**, historical interactions **~10,186**. Log scale prevents the historical bar from swallowing the others.

## End-to-end arc executives can recognize

Identity and catalog governance landed first so every later step inherited the same boundaries. Bronze ingestion and exploratory analysis anchored how “interest” is weighted before Gold tables were finalized. Streaming simulation stood in for Kafka without rewriting downstream logic; Delta Live Tables folded batch history and live-shaped events into one observable pipeline.

From substrate to steering committee

Governance & identities

Bronze ingest & EDA

Streaming simulation

DLT medallion pipeline

Feature Store registration

Hybrid ML & MLflow

Registry & promotion gate

Serving & inference logs

Workflow automation

Monitoring & dashboard

Each stage unlocked the next: registered features tied training to lineage; the registry gate connected metrics to ship/no-ship; workflows added branching so weekly retrains do not automatically bless a weaker ranker.

## Hybrid scoring and cold-start on purpose

Collaborative signal (ALS-style with an implementation path suited to serverless constraints), content similarity from product-side features, and a tunable blend with grid-searched mixing weights address the “small sparse catalog” reality instead of pretending it away. Separate cold-start helpers make behavior for unknown users or SKUs explicit before serving, not after complaints arrive.

Where the approaches meet

Collaborative signal

Content similarity

Blend · search α

Hybrid scores

Cold-start fallbacks

Hybrid scores

α is tuned with documented grid search; nested MLflow runs preserve how each candidate blend was chosen.

## What “better” means in the evaluation suite

Ranking quality and diversity are tracked across multiple standard metrics; they inform experiments and narrative, while the registry gate below turns one ranking criterion into an operational veto.

Metrics named in the program documentation

No headline uplift numbers are asserted here—tie external revenue claims to your own experimentation layer.

## Promotion only when ranking quality strictly improves

Challengers advance to the champion alias only when NDCG@10 strictly beats the incumbent; the previous champion alias remains for rollback. That converts experiment output into a leadership-readable guarantee: training can finish without automatically rewriting production behavior.

Ship / hold decision

Challenger artifact ready

NDCG@10 strictly beats champion?

Promote · retain previous champion alias

Hold champion · no deploy

Regression notebooks explicitly show inferior challengers failing the gate—evidence you can walk through with risk owners.

## Serving posture and intended traffic split

The managed REST endpoint logs inference payloads for downstream monitoring; cold-start behavior mirrors the training-era helpers. Configuration encodes a 90% champion / 10% challenger intent, while verification notes that live traffic may remain on a single stable version until both artifact paths are healthy—a stability-first nuance worth stating to executives upfront.

Configured routing intent

Repository configuration expresses the champion/challenger mix; operations may temporarily route 100% to a known-good build.

Weekly heavy-path runtime (documented)

15–60+

minutes cited for full orchestrated paths—plan reviews and support windows accordingly.

Branching

Training tasks can complete without auto-promoting when the gate says hold.

Verification leaned on selective runs rather than always exercising promote-and-deploy.

## Automation without blind deploys

Asset bundles describe weekly jobs that refresh the lakehouse pipeline, republish features, train collaborative and content paths in parallel, blend the hybrid, derive a promotion flag, and branch—only the passing path hits the registry gate and serving refresh. Daily jobs cover incremental pipeline plus feature refresh between heavier retrains.

Weekly skeleton leadership cares about

DLT refresh

Feature publish

Train ALS

Train content

Train hybrid

Promotion flag

Branch

Promote allowed

Promotion gate

Serving update

Skip

Skip promote

Parallel trainers shorten wall-clock time; the conditional branch is the control lever between experimentation velocity and production safety.

## Closing the loop for operators

Lakehouse Monitoring profiles inference traffic and Gold feature tables into drift-oriented metrics consumed by SQL views and a multi-page Streamlit app. Without inference logging as a first-class dataset, “how is the model doing?” collapses into anecdote—here it stays grounded in tables executives can audit.

Observability spine

Serving endpoint

Inference payloads

Lakehouse Monitoring

Dashboard app

Gold features

Lakehouse Monitoring

The same logs that power drift checks also feed stakeholder-facing pages—live recommendations, model performance, pipeline health, and catalog signals.

Keep in mind

“What you see here is a snapshot—each project has layers of research, collaboration, and tough decisions that shaped the outcome. If something catches your eye, let's talk about how that experience translates to what you're working on.”

### Check out the rest of the projects

- [RAG+ evaluation system](https://www.gloriarusenova.com/ml/rag-evaluation-system)
- [Fraud detection system](https://www.gloriarusenova.com/ml/fraud-detection-system)
- [Real-time AI meeting assistant](https://www.gloriarusenova.com/ml/ai-meeting-assistant)

Let's work

Together

I build solutions using machine learning engineering, data science, and product design — end to end.

[Say hello](mailto:gloriarusenova@gmail.com)