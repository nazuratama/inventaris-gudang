import { listMovements } from "../api/movement-api.js";
import { closeModal, openModal } from "./modal.js";
import { createErrorState, createPageLoading } from "./states.js";
import { showToast } from "./toast.js";
import {
  addCalendarNote,
  datesWithNotes,
  deleteCalendarNote,
  getNotesForDate,
  updateCalendarNote,
} from "../utils/calendar-notes.js";
import { getCollection } from "../utils/data.js";
import { button, element, icon, replace } from "../utils/dom.js";
import { formatDateTime, formatNumber } from "../utils/formatting.js";
import {
  legendItem,
  navButton,
  renderDayMovements,
} from "./dashboard-calendar/presentation.js";
import {
  buildActivityMap,
  buildMonthCells,
  capitalize,
  filterMovementsForLocalDay,
  isTodayKey,
  localDayApiQuery,
  monthQueryRange,
  toDateKey,
} from "./dashboard-calendar/date-utils.js";

const WEEKDAY_LABELS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

export function createDashboardCalendar({ recentMovements = [] } = {}) {
  let viewYear = new Date().getFullYear();
  let viewMonth = new Date().getMonth(); // 0-indexed
  let monthAbort = null;
  /** @type {Map<string, { in: number, out: number }>} */
  let monthActivity = buildActivityMap(recentMovements || []);

  const root = element("section", {
    className: ["card", "dashboard-calendar-card"],
    attributes: { "aria-label": "Kalender gudang" },
  });
  const body = element("div", { className: "dashboard-calendar-body" });
  root.append(body);

  function paintGrid() {
    replace(body, renderMonthView());
  }

  function paint() {
    paintGrid();
    void loadMonthActivity();
  }

  async function loadMonthActivity() {
    monthAbort?.abort();
    monthAbort = new AbortController();
    const signal = monthAbort.signal;
    const range = monthQueryRange(viewYear, viewMonth);
    try {
      const data = await listMovements(
        {
          date_from: range.date_from,
          date_to: range.date_to,
          page: 1,
          page_size: 100,
          sort: "created_at",
          order: "desc",
          data_scope: "all",
        },
        { signal },
      );
      if (signal.aborted) {
        return;
      }
      const movements = getCollection(data, ["movements", "items", "results"]);
      // Group by browser-local calendar day so dots match the day the user sees.
      monthActivity = buildActivityMap([...movements, ...(recentMovements || [])]);
      paintGrid();
    } catch (error) {
      if (error?.name === "AbortError") {
        return;
      }
    }
  }

  function renderMonthView() {
    const noteKeys = datesWithNotes();
    const todayKey = toDateKey(new Date());
    const title = new Intl.DateTimeFormat("id-ID", {
      month: "long",
      year: "numeric",
    }).format(new Date(viewYear, viewMonth, 1));
    const cells = buildMonthCells(viewYear, viewMonth);

    return element("div", {
      className: "dashboard-calendar-shell",
      children: [
        element("div", {
          className: "dashboard-calendar-toolbar",
          children: [
            element("div", {
              className: "dashboard-calendar-nav-group",
              children: [
                navButton(
                  "Tahun sebelumnya",
                  "chevron-left",
                  () => {
                    viewYear -= 1;
                    paint();
                  },
                  "dashboard-calendar-nav-year",
                ),
                navButton("Bulan sebelumnya", "chevron-left", () => {
                  shiftMonth(-1);
                  paint();
                }),
              ],
            }),
            element("div", {
              className: "dashboard-calendar-heading",
              children: [
                element("strong", { text: capitalize(title) }),
                element("small", {
                  text: "Klik tanggal · masuk, keluar, dan catatan",
                }),
              ],
            }),
            element("div", {
              className: "dashboard-calendar-nav-group",
              children: [
                navButton("Bulan berikutnya", "chevron-right", () => {
                  shiftMonth(1);
                  paint();
                }),
                navButton(
                  "Tahun berikutnya",
                  "chevron-right",
                  () => {
                    viewYear += 1;
                    paint();
                  },
                  "dashboard-calendar-nav-year",
                ),
              ],
            }),
          ],
        }),
        element("div", {
          className: "dashboard-calendar-weekdays",
          children: WEEKDAY_LABELS.map((label) =>
            element("span", { className: "dashboard-calendar-wd-label", text: label }),
          ),
        }),
        element("div", {
          className: "dashboard-calendar-month-grid",
          attributes: { role: "grid", "aria-label": title },
          children: cells.map((cell) => {
            if (cell.blank) {
              return element("div", {
                className: "dashboard-calendar-cell is-blank",
                attributes: { "aria-hidden": "true" },
              });
            }
            const hasNotes = noteKeys.has(cell.key);
            const activity = monthActivity.get(cell.key) || { in: 0, out: 0 };
            const hasIn = activity.in > 0;
            const hasOut = activity.out > 0;
            const hasMovement = hasIn || hasOut;
            const isToday = cell.key === todayKey;
            const ariaBits = [
              cell.label,
              hasNotes ? "ada catatan" : null,
              hasIn ? `${activity.in} masuk` : null,
              hasOut ? `${activity.out} keluar` : null,
            ]
              .filter(Boolean)
              .join(", ");
            return element("button", {
              className: [
                "dashboard-calendar-cell",
                isToday ? "is-today" : null,
                cell.outside ? "is-outside" : null,
                hasNotes ? "has-notes" : null,
                hasMovement ? "has-movement" : null,
              ],
              attributes: {
                type: "button",
                "aria-label": ariaBits,
              },
              events: {
                click: () => openDayEditor(cell.key, cell.label),
              },
              children: [
                element("span", {
                  className: "dashboard-calendar-cell-day",
                  text: String(cell.day),
                }),
                element("span", {
                  className: "dashboard-calendar-cell-dots",
                  attributes: { "aria-hidden": "true" },
                  children: [
                    hasNotes ? element("i", { className: "dot dot-note" }) : null,
                    hasIn ? element("i", { className: "dot dot-in" }) : null,
                    hasOut ? element("i", { className: "dot dot-out" }) : null,
                  ],
                }),
              ],
            });
          }),
        }),
        element("div", {
          className: "dashboard-calendar-legend",
          children: [
            legendItem("dot-note", "Catatan"),
            legendItem("dot-in", "Masuk"),
            legendItem("dot-out", "Keluar"),
            button("Hari ini", {
              className: ["button-quiet", "button-compact"],
              onClick: () => {
                const current = new Date();
                viewYear = current.getFullYear();
                viewMonth = current.getMonth();
                paint();
              },
            }),
          ],
        }),
      ],
    });
  }

  function shiftMonth(delta) {
    const next = new Date(viewYear, viewMonth + delta, 1);
    viewYear = next.getFullYear();
    viewMonth = next.getMonth();
  }

  function openDayEditor(dateKey, label) {
    const dialogEl = document.getElementById("appDialog");
    dialogEl?.classList.add("calendar-day-window-dialog");

    let activeTab = "movements";
    let notes = getNotesForDate(dateKey);
    let dayAbort = new AbortController();
    let charCount = 0;

    const tabNav = element("div", {
      className: "calendar-day-tabs",
      attributes: { role: "tablist", "aria-label": "Bagian hari" },
    });
    const scrollHost = element("div", {
      className: "calendar-day-scroll",
      attributes: { "aria-live": "polite" },
    });
    const composeDock = element("div", {
      className: "calendar-day-compose-dock",
      attributes: { hidden: true },
    });

    const noteInput = element("textarea", {
      className: "calendar-note-input",
      attributes: {
        rows: 3,
        maxlength: 500,
        placeholder: "Tulis catatan gudang untuk tanggal ini…",
        "aria-label": "Catatan baru",
      },
    });
    const charMeta = element("small", {
      className: "subtle calendar-compose-count",
      text: "0 / 500",
    });
    noteInput.addEventListener("input", () => {
      charCount = noteInput.value.length;
      charMeta.textContent = `${formatNumber(charCount)} / 500`;
    });

    function paintTabs() {
      replace(
        tabNav,
        tabButton("movements", "Pergerakan", "history"),
        tabButton("notes", "Catatan", "edit"),
      );
    }

    function tabButton(id, text, iconName) {
      return element("button", {
        className: ["calendar-day-tab", activeTab === id ? "is-active" : null],
        attributes: {
          type: "button",
          role: "tab",
          "aria-selected": activeTab === id ? "true" : "false",
        },
        events: {
          click: () => {
            if (activeTab === id) {
              return;
            }
            activeTab = id;
            paintTabs();
            paintTabBody();
          },
        },
        children: [icon(iconName), element("span", { text })],
      });
    }

    function paintTabBody() {
      composeDock.hidden = activeTab !== "notes";
      if (activeTab === "movements") {
        replace(scrollHost, createPageLoading(0));
        void loadDayMovements();
        return;
      }
      paintNotesList();
    }

    function paintNotesList() {
      notes = getNotesForDate(dateKey);
      if (!notes.length) {
        replace(
          scrollHost,
          element("div", {
            className: "calendar-day-notes-empty",
            children: [
              element("span", {
                className: "calendar-day-notes-empty-icon",
                children: [icon("edit")],
              }),
              element("strong", { text: "Belum ada catatan" }),
              element("p", {
                className: "muted",
                text: "Gunakan kolom di bawah untuk menambah catatan hari ini.",
              }),
            ],
          }),
        );
        return;
      }
      replace(
        scrollHost,
        element("div", {
          className: "calendar-day-note-list",
          children: notes.map((note) =>
            element("article", {
              className: "calendar-day-note-item",
              children: [
                element("div", {
                  className: "calendar-day-note-copy",
                  children: [
                    element("p", { text: note.text }),
                    element("small", {
                      className: "subtle",
                      text: formatDateTime(note.updated_at || note.created_at),
                    }),
                  ],
                }),
                element("div", {
                  className: "calendar-day-note-actions",
                  children: [
                    button("Ubah", {
                      className: ["button-quiet", "button-compact"],
                      onClick: () => {
                        const next = window.prompt("Ubah catatan", note.text);
                        if (next === null) {
                          return;
                        }
                        const saved = updateCalendarNote(dateKey, note.id, next);
                        if (!saved) {
                          showToast({
                            type: "error",
                            title: "Catatan kosong",
                            message: "Isi teks catatan sebelum menyimpan.",
                          });
                          return;
                        }
                        paintNotesList();
                        paintGrid();
                      },
                    }),
                    button("Hapus", {
                      className: ["button-quiet", "button-compact"],
                      onClick: () => {
                        deleteCalendarNote(dateKey, note.id);
                        paintNotesList();
                        paintGrid();
                        showToast({
                          type: "success",
                          title: "Catatan dihapus",
                          message: "Catatan tanggal ini telah dihapus.",
                        });
                      },
                    }),
                  ],
                }),
              ],
            }),
          ),
        }),
      );
    }

    async function loadDayMovements() {
      dayAbort.abort();
      dayAbort = new AbortController();
      const signal = dayAbort.signal;
      try {
        // Query a padded range, then keep only movements that fall on this
        // local calendar day (handles UTC storage vs WIB display).
        const query = localDayApiQuery(dateKey);
        const data = await listMovements(
          {
            date_from: query.date_from,
            date_to: query.date_to,
            page: 1,
            page_size: 100,
            sort: "created_at",
            order: "desc",
            data_scope: "all",
          },
          { signal },
        );
        if (signal.aborted || activeTab !== "movements") {
          return;
        }
        const raw = getCollection(data, ["movements", "items", "results"]);
        const movements = filterMovementsForLocalDay(raw, dateKey);
        replace(scrollHost, renderDayMovements(movements));

        const stats = { in: 0, out: 0 };
        for (const movement of movements) {
          const type = String(movement.movement_type || "").toUpperCase();
          if (type === "IN") {
            stats.in += 1;
          } else if (type === "OUT") {
            stats.out += 1;
          }
        }
        const nextMap = new Map(monthActivity);
        if (stats.in || stats.out) {
          nextMap.set(dateKey, stats);
        } else {
          nextMap.delete(dateKey);
        }
        monthActivity = nextMap;
        paintGrid();
      } catch (error) {
        if (error?.name === "AbortError" || signal.aborted) {
          return;
        }
        if (activeTab !== "movements") {
          return;
        }
        replace(
          scrollHost,
          createErrorState(error, () => {
            void loadDayMovements();
          }),
        );
      }
    }

    const addButton = button("Simpan catatan", {
      variant: "button-primary",
      iconName: "save",
      modalAction: "submit",
      onClick: () => {
        const saved = addCalendarNote(dateKey, noteInput.value);
        if (!saved) {
          showToast({
            type: "error",
            title: "Catatan kosong",
            message: "Tulis isi catatan terlebih dahulu.",
          });
          noteInput.focus();
          return;
        }
        noteInput.value = "";
        charCount = 0;
        charMeta.textContent = "0 / 500";
        paintNotesList();
        paintGrid();
        showToast({
          type: "success",
          title: "Catatan disimpan",
          message: "Catatan tersimpan di perangkat ini.",
        });
        noteInput.focus();
      },
    });

    replace(
      composeDock,
      element("div", {
        className: "calendar-day-compose",
        children: [
          element("div", {
            className: "calendar-compose-head",
            children: [
              element("label", {
                className: "calendar-compose-label",
                attributes: { for: "calendarDayNoteInput" },
                text: "Tambah catatan",
              }),
              charMeta,
            ],
          }),
          (() => {
            noteInput.id = "calendarDayNoteInput";
            return noteInput;
          })(),
          element("div", {
            className: "calendar-compose-actions",
            children: [
              element("small", {
                className: "subtle",
                text: "Hanya tersimpan di perangkat ini",
              }),
              addButton,
            ],
          }),
        ],
      }),
    );

    const shell = element("div", {
      className: "calendar-day-shell",
      children: [
        tabNav,
        element("div", {
          className: "calendar-day-panel",
          children: [scrollHost, composeDock],
        }),
      ],
    });

    paintTabs();
    paintTabBody();

    openModal({
      size: "settings",
      eyebrow: isTodayKey(dateKey) ? "Kalender · Hari ini" : "Kalender gudang",
      title: label,
      description: "Barang masuk/keluar dan catatan lokal untuk tanggal ini.",
      body: shell,
      footer: [],
      submitOnEnter: false,
      initialFocus: undefined,
      onClose: () => {
        dayAbort.abort();
        dialogEl?.classList.remove("calendar-day-window-dialog");
      },
    });
  }

  paint();
  return root;
}
