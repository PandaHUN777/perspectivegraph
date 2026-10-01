import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Calibration } from "../api/client";
import { CalibrationPanel } from "./CalibrationPanel";

function calibration(over: Partial<Calibration> = {}): Calibration {
  return {
    samples: 500,
    brier: 0.2,
    logLoss: 0.6,
    ece: 0.04,
    meanPredicted: 0.5,
    observedRate: 0.5,
    verdict: "well-calibrated",
    hasData: true,
    bins: [],
    ...over,
  };
}

describe("CalibrationPanel", () => {
  it("renders nothing without calibration data", () => {
    const { container } = render(
      <CalibrationPanel calibration={calibration({ hasData: false })} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("shows a provisional badge below 30 samples and the verdict from 30", () => {
    const { rerender } = render(
      <CalibrationPanel
        calibration={calibration({ samples: 29, verdict: "overconfident" })}
      />,
    );

    expect(screen.getByText("provisional")).toBeInTheDocument();
    expect(screen.queryByText("overconfident")).toBeNull();

    rerender(
      <CalibrationPanel
        calibration={calibration({ samples: 30, verdict: "overconfident" })}
      />,
    );

    expect(screen.getByText("overconfident")).toBeInTheDocument();
    expect(screen.queryByText("provisional")).toBeNull();
  });

  it("shows the calibration statistics and only renders a rescale factor when set", () => {
    const { rerender } = render(
      <CalibrationPanel
        calibration={
          calibration({
            samples: 42,
            brier: 0.1236,
            ece: 0.0361,
            meanPredicted: 0.56,
            observedRate: 0.42,
          })
        }
      />,
    );

    expect(screen.getByText("Brier score", { exact: true })).toBeInTheDocument();
    expect(screen.getByText("0.124", { exact: true })).toBeInTheDocument();
    expect(screen.getByText("Calibration error", { exact: true })).toBeInTheDocument();
    expect(screen.getByText("0.036", { exact: true })).toBeInTheDocument();
    expect(screen.getByText("Outcomes", { exact: true })).toBeInTheDocument();
    expect(screen.getByText("42", { exact: true })).toBeInTheDocument();
    expect(screen.getByText("Predicted on average", { exact: true })).toBeInTheDocument();
    expect(screen.getByText("56%", { exact: true })).toBeInTheDocument();
    expect(screen.getByText("Happened", { exact: true })).toBeInTheDocument();
    expect(screen.getByText("42%", { exact: true })).toBeInTheDocument();
    expect(screen.queryByText("Rescale factor")).toBeNull();

    rerender(
      <CalibrationPanel
        calibration={calibration({ samples: 42, recommendedScale: 1.15 })}
      />,
    );

    expect(screen.getByText("Rescale factor")).toBeInTheDocument();
    expect(screen.getByText("× 1.15")).toBeInTheDocument();
  });

  it("plots only populated reliability bins and names each one accessibly", () => {
    render(
      <CalibrationPanel
        calibration={
          calibration({
            bins: [
              { low: 0, high: 0.2, count: 4, meanPredicted: 0.2, observedRate: 0.25 },
              { low: 0.2, high: 0.4, count: 0, meanPredicted: 0.3, observedRate: 0.8 },
              { low: 0.6, high: 0.8, count: 6, meanPredicted: 0.7, observedRate: 0.6 },
            ],
          })
        }
      />,
    );

    const diagram = screen.getByRole("img", {
      name: "Reliability diagram: predicted 20%, observed 25% over 4; predicted 70%, observed 60% over 6",
    });

    expect(diagram.querySelectorAll("circle")).toHaveLength(2);
  });

  it("shows the in-memory badge only for a non-persistent calibration with samples", () => {
    const { rerender } = render(
      <CalibrationPanel
        calibration={calibration({ persistent: false, samples: 0 })}
      />,
    );

    expect(screen.queryByText("in-memory")).toBeNull();

    rerender(
      <CalibrationPanel
        calibration={calibration({ persistent: false, samples: 1 })}
      />,
    );

    expect(screen.getByText("in-memory")).toBeInTheDocument();

    rerender(
      <CalibrationPanel
        calibration={calibration({ persistent: true, samples: 1 })}
      />,
    );

    expect(screen.queryByText("in-memory")).toBeNull();
  });

  it("shows a Brier trend only when at least two points are available", () => {
    const { rerender } = render(
      <CalibrationPanel
        calibration={calibration()}
        trend={[{ at: "2026-10-01T00:00:00Z", brier: 0.2, ece: 0.04, samples: 10 }]}
      />,
    );

    expect(screen.queryByText("Brier score over time")).toBeNull();

    rerender(
      <CalibrationPanel
        calibration={calibration()}
        trend={[
          { at: "2026-10-01T00:00:00Z", brier: 0.2, ece: 0.04, samples: 10 },
          { at: "2026-10-02T00:00:00Z", brier: 0.15, ece: 0.03, samples: 20 },
        ]}
      />,
    );

    expect(screen.getByText("Brier score over time")).toBeInTheDocument();
  });
});
