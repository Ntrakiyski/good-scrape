---
title: "Studio — AI Web Design"
url: "https://www.gloriarusenova.com/ml/rag-evaluation-system"
---

## What I Built

A production-ready RAG pipeline with a dedicated evaluation framework—so performance is measurable, debuggable, and improvable.

RAG + Evaluation Framework

- Essential for validating system performance and behavior.
- Especially important for unseen information not present in base model training.

Correctness Guarantees

- Ensures results are accurate and reliable.
- Makes failure modes visible instead of “silent wrong answers.”

Continuous Improvement Loop

- Measures failure points and failure rates.
- Supports rapid iteration on retrieval, reranking, and prompting.

## The Challenge

Organizations struggle to extract insights from large document repositories. Teams spend hours searching through technical documentation—and traditional keyword search misses relevant info due to semantic gaps.

Problem statement

Traditional keyword search can miss a large portion of relevant results, which leads to duplicated work, missed opportunities, and slow decision-making.

## Selecting the Right Approach

Imagine searching hundreds of PDFs to find one answer—then getting it in seconds with sources cited.

Two‑Stage Retrieval

Vector search + AI re‑ranking for significantly better relevance.

Custom Evaluation Framework

Precision, Recall, and MRR metrics for continuous improvement.

Real‑Time Q&A Interface

Source attribution with low-latency answers.

Production‑Ready API

Modular design with scalable architecture.

## The Architecture

Understands what you’re really asking (not just keywords), searches the right documents instantly, and returns grounded answers.

Smart Retrieval System

Understands intent—not just matching words.

- Vector embeddings (OpenAI) + LanceDB for semantic search.
- Cohere re-ranking reduced false positives by 35%.
- Achieved 92% precision vs. 67% baseline keyword search.
- L2 distance metric for optimal similarity matching.

Evaluation Framework

Every answer is tested—and we know if it’s correct.

- Custom metrics: Precision, Recall, Mean Reciprocal Rank (MRR).
- AI-powered correctness validation using GPT‑4.
- 25 test questions with ground truth for continuous benchmarking.
- Automated test harness for iteration and regression detection.

Production Architecture

Like LEGO blocks—swap parts without rebuilding everything.

- Modular design: Indexer → Datastore → Retriever → Generator.
- CLI + Web interface built with Python/Reflex framework.
- Handles 60+ document chunks with sub‑second retrieval.
- SQLAlchemy + Alembic for robust database management.

![RAG production architecture graph](https://www.gloriarusenova.com/assets/rag-graph-Dh6ED_Uz.png)

## Results & Impact

What used to take half a morning now happens while coffee is brewing.

Quantifiable outcomes

- 92% precision
- 89% recall on test dataset
- 85% reduction in information retrieval time
- 0.94 Mean Reciprocal Rank for ranking quality

Business value

- Saves teams hours on documentation search
- Enables instant access to knowledge
- Scales with growing document repositories
- Improves decisions with faster insights

## Tech Stack

Production-grade tools used to handle real-world scale.

Technologies

PythonOpenAI APICohereLanceDBReactDoclingSQLAlchemyAlembicFastAPIGit

Categories

ML EngineeringVector DatabasesLLM IntegrationSystem DesignAPI DevelopmentEvaluation MetricsFull‑Stack Development

Keep in mind

“What you see here is a snapshot—each project has layers of research, collaboration, and tough decisions that shaped the outcome. If something catches your eye, let's talk about how that experience translates to what you're working on.”

### Check out the rest of the projects

- [Fraud detection system](https://www.gloriarusenova.com/ml/fraud-detection-system)
- [Real-time AI meeting assistant](https://www.gloriarusenova.com/ml/ai-meeting-assistant)
- [E-commerce recommendation system](https://www.gloriarusenova.com/ml/recommendation-system)

Let's work

Together

I build solutions using machine learning engineering, data science, and product design — end to end.

[Say hello](mailto:gloriarusenova@gmail.com)

---

### Page Assets

- [RAG production architecture graph](https://www.gloriarusenova.com/assets/rag-graph-Dh6ED_Uz.png)
- [video](https://www.gloriarusenova.com/videos/rag-video.mov)
