# Execution Engine API Documentation

A TypeScript library for tracing and visualizing code execution workflows

## Table of Contents

- [Installation](#installation-)
- [Components](#components-)
    - [ExecutionTimer](#executiontimer)
    - [TraceableExecution](#traceableexecution)
    - [ExecutionEngine](#executionengine)

## Installation 📦

```bash
npm install execution-engine
```

## Components 🧩

### ExecutionTimer

The __[ExecutionTimer](./ExecutionTimer.md)__ is a simple class for measuring the execution time of code blocks.

### TraceableExecution

The __[TraceableExecution](./TraceableExecution.md)__ class provides a framework for traceable execution of functions.

### ExecutionEngine

The __[ExecutionEngine](./ExecutionEngine.md)__ enhances traceable execution by introducing a context object (`CXT`) for
capturing additional relevant information.
It builds upon the functionality of [TraceableExecution](./TraceableExecution.md).

