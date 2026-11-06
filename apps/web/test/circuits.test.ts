import { describe, expect, it } from "vitest";
import { CIRCUIT_NOTES, notesFor } from "../content/circuits";

describe("notas de frenadas (NUC-44)", () => {
  const corners = [
    { n: 1, at: 0.277 },
    { n: 2, at: 0.489 },
    { n: 4, at: 0.62 },
    { n: 6, at: 0.86 },
  ];

  it("casa cada nota con la frenada más cercana dentro de la tolerancia", () => {
    const notes = notesFor("rodriguez", corners);
    expect(notes.get(1)?.turn).toBe("1");
    expect(notes.get(4)?.turn).toBe("7–11");
    expect(notes.get(6)?.turn).toBe("12–16");
    expect(notes.has(2)).toBe(false);
  });

  it("si la frenada detectada queda lejos, la nota no se pone en otra", () => {
    expect(notesFor("rodriguez", [{ n: 1, at: 0.4 }]).size).toBe(0);
    expect(notesFor("desconocido", corners).size).toBe(0);
  });

  it("todas las notas tienen texto en los dos idiomas y posiciones dentro de la vuelta", () => {
    for (const notes of Object.values(CIRCUIT_NOTES)) {
      for (const n of notes) {
        expect(n.at).toBeGreaterThan(0);
        expect(n.at).toBeLessThan(1);
        expect(n.note.es.length).toBeGreaterThan(10);
        expect(n.note.en.length).toBeGreaterThan(10);
      }
    }
  });
});
