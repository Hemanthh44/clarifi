from app.schemas import AgentTraceStep


class Trace:
    """Small helper so every agent records its steps the same way,
    powering the frontend's Agent Activity panel and Evidence Trail."""

    def __init__(self) -> None:
        self.steps: list[AgentTraceStep] = []

    def log(self, agent: str, action: str) -> None:
        self.steps.append(AgentTraceStep(agent=agent, action=action))

    def as_list(self) -> list[AgentTraceStep]:
        return self.steps
