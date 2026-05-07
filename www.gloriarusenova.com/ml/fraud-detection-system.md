---
title: "Studio — AI Web Design"
url: "https://www.gloriarusenova.com/ml/fraud-detection-system"
---

## What I Built

A fraud detection system to test feature performance across multiple algorithms and optimize for the highest fraud detection rate—without overwhelming analysts with false alarms.

Imbalanced data reality

- Credit card fraud costs businesses $32B annually, yet only 0.17% of transactions are fraudulent.
- Extreme imbalance makes many approaches either miss fraud or create too many false positives.

Feature-first strategy

- Engineered features to surface “what makes a transaction suspicious.”
- Focused on interpretable risk patterns before model selection.

Business translation

- Converted model metrics into cost-benefit outcomes.
- Segment analysis to understand strengths and weaknesses.

## Selecting the Right Approach

Instead of jumping straight to algorithms, I started with a human question: “What makes a transaction suspicious?” That framed the system design.

Data analyses

Analyzed 284K transactions to uncover risk patterns.

Feature engineering

Created 21 custom features using domain knowledge + statistics.

Algorithm testing

Compared three algorithms and selected XGBoost.

Business results

Calculated $2.7M annual value + segment analysis by threshold.

## Data Analyses

Key signals discovered in the dataset.

Transactions

Analyzed 284K transactions over 2 days

Outliers

Isolation Forest outliers had 217× fraud concentration

High risk

Night transactions = 3× higher risk

## Feature Engineering

Created 21 custom features in 3 tiers. Top engineered feature (pca\_magnitude) became #1 most important (34.5% model weight).

Statistical

Strong baseline signals from transformation + time + outlier scoring.

- pca magnitude
- log amount, amount zscore
- hour sin, hour cos, is night
- Isolation Forest outlier scores

Domain specific

Features inspired by how fraud actually shows up in the real world.

- amount percentile
- is round\_amount
- V14 amount interaction

Advanced

Higher-order signals for separation under extreme imbalance.

- distance to fraud
- feature entropy
- dominant feature value

## Algorithm Testing

Compared 3 algorithms and selected XGBoost: 83.8% recall, handling extreme class imbalance.

Best balance

Algorithm

Recall

Precision

ROC-AUC

Status

Logistic Regression

79.4%

63.2%

0.951

Lower recall

Random Forest

81.7%

71.8%

0.963

Slower

XGBoost

83.8%

75.2%

0.968

Selected

## Business Results

Operational view of throughput, fraud catch rate, and annual savings—aligned with the product demo opening this case study.

## Cost‑Benefit Breakdown

How catching fraud impacts business revenue—and how much we can save.

Without a system

All 492 frauds succeed = -$3.3M lost per year.

With a system

- Fraud prevented: 413 frauds → $2.77M saved
- Missed: 79 frauds → $535K loss

## Technical Performance

Comprehensive metrics and key technical achievements.

83.8%

Recall (413 / 492 frauds)

75.2%

Precision (3 out of 4 alerts are real)

0.968

ROC‑AUC (near-perfect discrimination)

0.048%

False alarm rate (41 / 85K transactions)

<50ms

Latency (real-time capable)

## Segment Analysis (Honest Assessment)

Balancing recall (catch fraud) vs precision (minimize false alarms) without business context—solved by calculating cost-benefit tradeoffs at different thresholds.

Strengths

- High-value fraud (>$500): 94% recall
- Medium transactions ($100-$500): 89% recall
- Night transactions: 91% recall
- Isolation Forest feature creation: outlier scores had 217× fraud concentration

Weaknesses

- Micro-transactions (<$10): 78% recall
- Very small frauds likely card testing patterns

## What Worked Well

Key learnings that drove performance.

Feature engineering over algorithm choice

- Focused on data signal quality.

Business-driven threshold optimization

- Optimized for cost-benefit, not just metrics.

Segment analysis

- Understood where the model wins and fails.

## Technologies Used

Tools used for modeling, deployment, and dashboards.

Technologies

Python 3.13XGBoost 3.1.0scikit-learnimbalanced-learnpandasnumpyscipyDockerplotlySQLitejoblibLoad balancer

Categories

Machine LearningData ProcessingDeployment & Infrastructure

Keep in mind

“What you see here is a snapshot—each project has layers of research, collaboration, and tough decisions that shaped the outcome. If something catches your eye, let's talk about how that experience translates to what you're working on.”

### Check out the rest of the projects

- [RAG+ evaluation system](https://www.gloriarusenova.com/ml/rag-evaluation-system)
- [Real-time AI meeting assistant](https://www.gloriarusenova.com/ml/ai-meeting-assistant)
- [E-commerce recommendation system](https://www.gloriarusenova.com/ml/recommendation-system)

Let's work

Together

I build solutions using machine learning engineering, data science, and product design — end to end.

[Say hello](mailto:gloriarusenova@gmail.com)

---

### Page Assets

- [video](https://www.gloriarusenova.com/assets/fraud-detection-video-ti063wqz.mov)
