import { useEffect, useMemo, useState } from "react";

/*
  Kitchen Prep Control
  --------------------
  This is a complete beginner-friendly Vite + React MVP.

  Important: this version saves data in the browser using localStorage.
  That means it is perfect for testing and showing the system on Vercel,
  but it does NOT yet sync live between different phones/computers.
  For a real multi-device restaurant system, connect this same UI to
  Supabase/Firebase later.
*/

const STORAGE_KEY = "kitchen-prep-control-v1";

function makeId(prefix = "id") {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function todayISO() {
  // Returns today's date in the user's local timezone as YYYY-MM-DD.
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

function niceDate(dateString) {
  if (!dateString) return "No date";
  return new Date(`${dateString}T00:00:00`).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getPrepAgeLabel(dateString) {
  if (!dateString) return { text: "No prep date", className: "ageWarn" };

  const today = new Date(`${todayISO()}T00:00:00`);
  const prep = new Date(`${dateString}T00:00:00`);
  const diffDays = Math.round((today - prep) / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return { text: "Today", className: "ageGood" };
  if (diffDays === 1) return { text: "1 day old", className: "ageMedium" };
  return { text: `${diffDays} days old`, className: "ageWarn" };
}

function createDefaultBranch(name, shortCode) {
  const cookedId = makeId("cat-cooked");
  const saucesId = makeId("cat-sauces");
  const freshId = makeId("cat-fresh");
  const rawId = makeId("cat-raw");

  return {
    id: makeId("branch"),
    name,
    shortCode,
    active: true,
    codes: {
      // You can change these from Setup > Access Codes.
      staff: `${shortCode}-247`,
      manager: `${shortCode}-MANAGER`,
      setup: `${shortCode}-ADMIN`,
    },
    units: [
      { id: makeId("unit"), name: "Rectangular bowl", active: true },
      { id: makeId("unit"), name: "White yoghurt bucket", active: true },
      { id: makeId("unit"), name: "Yellow ghee bucket", active: true },
      { id: makeId("unit"), name: "Small yoghurt bucket", active: true },
      { id: makeId("unit"), name: "Margarine container", active: true },
      { id: makeId("unit"), name: "Kg", active: true },
      { id: makeId("unit"), name: "Litre", active: true },
    ],
    categories: [
      {
        id: cookedId,
        name: "Cooked Ingredients",
        active: true,
        items: [
          { id: makeId("item"), name: "Lamb", defaultUnit: "Rectangular bowl", active: true, separate: false },
          { id: makeId("item"), name: "Chicken", defaultUnit: "Rectangular bowl", active: true, separate: false },
          { id: makeId("item"), name: "Vegetables", defaultUnit: "Rectangular bowl", active: true, separate: false },
          { id: makeId("item"), name: "Spinach", defaultUnit: "Rectangular bowl", active: true, separate: false },
          { id: makeId("item"), name: "Potatoes", defaultUnit: "Rectangular bowl", active: true, separate: false },
          { id: makeId("item"), name: "Cauliflower", defaultUnit: "Rectangular bowl", active: true, separate: false },
          // Daal stays inside Cooked Ingredients and uses a bucket as its unit.
          { id: makeId("item"), name: "Daal", defaultUnit: "Yellow ghee bucket", active: true, separate: false },
        ],
      },
      {
        id: saucesId,
        name: "Sauces",
        active: true,
        items: [
          { id: makeId("item"), name: "Masala Sauce", defaultUnit: "Yellow ghee bucket", active: true, separate: false },
          { id: makeId("item"), name: "Korma Sauce", defaultUnit: "Yellow ghee bucket", active: true, separate: false },
          { id: makeId("item"), name: "Butter Sauce", defaultUnit: "Margarine container", active: true, separate: false },
          { id: makeId("item"), name: "Jalfrezi Sauce", defaultUnit: "Margarine container", active: true, separate: false },
          { id: makeId("item"), name: "Balti Sauce", defaultUnit: "Yellow ghee bucket", active: true, separate: false },
        ],
      },
      {
        id: freshId,
        name: "Fresh Prep",
        active: true,
        items: [
          { id: makeId("item"), name: "Chopped Garlic", defaultUnit: "Small yoghurt bucket", active: true, separate: false },
          { id: makeId("item"), name: "Whole Peeled Garlic", defaultUnit: "Small yoghurt bucket", active: true, separate: false },
          { id: makeId("item"), name: "Peeled Onions", defaultUnit: "White yoghurt bucket", active: true, separate: false },
          { id: makeId("item"), name: "Thinly Sliced Ginger", defaultUnit: "Margarine container", active: true, separate: false },
          { id: makeId("item"), name: "Green Chillies", defaultUnit: "Margarine container", active: true, separate: false },
        ],
      },
      {
        id: rawId,
        name: "Raw Items",
        active: true,
        items: [],
      },
    ],
    leftovers: {},
    assignments: [],
  };
}

function createDefaultData() {
  return normalizeData({
    ownerCode: "OWNER2026",
    branches: [createDefaultBranch("Orpington", "ORP"), createDefaultBranch("Swanley", "SWA")],
  });
}

function normalizeData(data) {
  // Safety rule: Daal must always live inside Cooked Ingredients.
  // This also fixes older browser/localStorage data where Daal may have been saved as its own category.
  return {
    ...data,
    branches: (data.branches || []).map((branch) => {
      let categories = (branch.categories || []).map((category) => ({
        ...category,
        items: (category.items || []).map((item) => ({ ...item, separate: false })),
      }));

      let cookedIndex = categories.findIndex((category) =>
        (category.name || "").toLowerCase().includes("cooked")
      );

      if (cookedIndex === -1) {
        categories.unshift({ id: makeId("cat"), name: "Cooked Ingredients", active: true, items: [] });
        cookedIndex = 0;
      }

      const movedDaalItems = [];
      categories = categories
        .map((category, index) => {
          const categoryName = (category.name || "").toLowerCase();
          const keptItems = [];

          for (const item of category.items || []) {
            const isDaal = (item.name || "").toLowerCase().trim() === "daal" ||
              (item.name || "").toLowerCase().trim() === "dall";

            if (isDaal && index !== cookedIndex) {
              movedDaalItems.push({
                ...item,
                name: "Daal",
                defaultUnit: item.defaultUnit || "Yellow ghee bucket",
                active: item.active !== false,
                separate: false,
              });
            } else {
              keptItems.push(isDaal ? { ...item, name: "Daal", defaultUnit: item.defaultUnit || "Yellow ghee bucket", separate: false } : item);
            }
          }

          return { ...category, items: keptItems, active: categoryName.includes("daal") ? false : category.active };
        })
        .filter((category) => !(category.name || "").toLowerCase().includes("daal"));

      cookedIndex = categories.findIndex((category) =>
        (category.name || "").toLowerCase().includes("cooked")
      );

      const cookedCategory = categories[cookedIndex];
      const cookedItems = [...(cookedCategory.items || []), ...movedDaalItems];
      const seenDaal = new Set();
      const finalCookedItems = cookedItems.filter((item) => {
        const isDaal = (item.name || "").toLowerCase().trim() === "daal" ||
          (item.name || "").toLowerCase().trim() === "dall";
        if (!isDaal) return true;
        if (seenDaal.has("daal")) return false;
        seenDaal.add("daal");
        item.name = "Daal";
        item.defaultUnit = item.defaultUnit || "Yellow ghee bucket";
        item.separate = false;
        return true;
      });

      if (!finalCookedItems.some((item) => (item.name || "").toLowerCase().trim() === "daal")) {
        finalCookedItems.push({ id: makeId("item"), name: "Daal", defaultUnit: "Yellow ghee bucket", active: true, separate: false });
      }

      categories[cookedIndex] = { ...cookedCategory, name: "Cooked Ingredients", active: true, items: finalCookedItems };

      return { ...branch, categories };
    }),
  };
}

function loadData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return createDefaultData();
    const parsed = JSON.parse(saved);
    if (!parsed?.branches?.length) return createDefaultData();
    return normalizeData(parsed);
  } catch {
    return createDefaultData();
  }
}

function cloneBranchSetup(sourceBranch, newName, newShortCode) {
  // Copies categories, items and units, but leaves leftovers/assignments empty.
  const copied = createDefaultBranch(newName, newShortCode);

  copied.units = sourceBranch.units.map((unit) => ({
    ...unit,
    id: makeId("unit"),
  }));

  copied.categories = sourceBranch.categories.map((category) => ({
    ...category,
    id: makeId("cat"),
    items: category.items.map((item) => ({ ...item, id: makeId("item") })),
  }));

  copied.codes = {
    staff: `${newShortCode}-247`,
    manager: `${newShortCode}-MANAGER`,
    setup: `${newShortCode}-ADMIN`,
  };

  copied.leftovers = {};
  copied.assignments = [];
  return copied;
}

function Button({ children, variant = "primary", className = "", ...props }) {
  return (
    <button className={`btn ${variant} ${className}`} {...props}>
      {children}
    </button>
  );
}

function TextInput({ label, ...props }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input {...props} />
    </label>
  );
}

function SelectInput({ label, children, ...props }) {
  return (
    <label className="field">
      <span>{label}</span>
      <select {...props}>{children}</select>
    </label>
  );
}

const NAV_ITEMS = [
  { key: "leftovers", label: "Current Leftovers" },
  { key: "assign", label: "Assign Prep" },
  { key: "staff", label: "Update Prep" },
  { key: "setup", label: "Setup" },
];

function PageShell({ branch, title, subtitle, onBack, children, activePage, onNavigate }) {
  const [menuOpen, setMenuOpen] = useState(false);

  function goToPage(pageKey) {
    setMenuOpen(false);
    onNavigate?.(pageKey);
  }

  return (
    <main className="mobileWorkspace">
      <section className="mobileShell">
        <header className="mobileTopBar">
          <button
            className="hamburgerBtn"
            onClick={() => setMenuOpen((value) => !value)}
            type="button"
            aria-label="Open navigation menu"
            aria-expanded={menuOpen}
          >
            <span />
            <span />
            <span />
          </button>

          <div className="mobileTitleBlock">
            <h1>{title}</h1>
            <p>{subtitle}</p>
            <small>{branch.name} · Prep Date: {niceDate(todayISO())}</small>
          </div>

          <div className="topBarSpacer" aria-hidden="true" />
        </header>

        {menuOpen && (
          <>
            <button className="menuBackdrop" type="button" aria-label="Close menu" onClick={() => setMenuOpen(false)} />
            <nav className="hamburgerMenuPanel modernDropdown" aria-label="Page navigation">
              <div className="dropdownTitle">
                <strong>Menu</strong>
                <span>{branch.name}</span>
              </div>
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className={activePage === item.key ? "active" : ""}
                  onClick={() => goToPage(item.key)}
                >
                  <strong>{item.label}</strong>
                </button>
              ))}
            </nav>
          </>
        )}

        <div className="mobileContent">{children}</div>
      </section>

      <button className="globalBackBtn" onClick={onBack} type="button" aria-label="Go back">
        &lt;
      </button>
    </main>
  );
}

function AccessGate({ title, description, expectedCode, onUnlock, children }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  function submit(e) {
    e.preventDefault();
    if (code.trim() === expectedCode) {
      setError("");
      onUnlock();
      return;
    }
    setError("Wrong code. Please check the code and try again.");
  }

  if (!expectedCode) {
    return <div className="notice">No access code is set for this area.</div>;
  }

  return (
    <div className="gateCenter">
      <div className="gateCard">
        <h2>{title}</h2>
        <p>{description}</p>
        <form onSubmit={submit} className="gateForm">
          <input
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Enter code"
            type="password"
          />
          <Button type="submit">Unlock</Button>
        </form>
        {error && <p className="errorText">{error}</p>}
        {children}
      </div>
    </div>
  );
}

function EmptyState({ title, text }) {
  return (
    <div className="emptyState">
      <strong>{title}</strong>
      <p>{text}</p>
    </div>
  );
}

function flattenItems(branch, includeInactive = false) {
  return branch.categories.flatMap((category) =>
    category.items
      .filter((item) => includeInactive || (category.active && item.active))
      .map((item) => ({ ...item, categoryId: category.id, categoryName: category.name }))
  );
}

function getLeftover(branch, item) {
  return (
    branch.leftovers[item.id] || {
      quantity: "0",
      unit: item.defaultUnit,
      prepDate: todayISO(),
      note: "",
    }
  );
}

function ItemTable({ title, items, branch, showSeparateLabel = false }) {
  if (!items.length) return null;

  return (
    <section className="panel">
      <div className="panelHeader">
        <h2>{title}</h2>
        <span>{items.length} items</span>
      </div>
      <div className="responsiveTable">
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Leftover</th>
              <th>Unit</th>
              <th>Prep Date</th>
              <th>Age</th>
              <th>Note</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const leftover = getLeftover(branch, item);
              const age = getPrepAgeLabel(leftover.prepDate);
              return (
                <tr key={item.id}>
                  <td>
                    <strong>{item.name}</strong>
                  </td>
                  <td>{leftover.quantity}</td>
                  <td>{leftover.unit}</td>
                  <td>{niceDate(leftover.prepDate)}</td>
                  <td>
                    <span className={`agePill ${age.className}`}>{age.text}</span>
                  </td>
                  <td>{leftover.note || "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function BranchEntryPage({ appData, onEnterBranch }) {
  const activeBranches = appData.branches.filter((branch) => branch.active);

  return (
    <main className="branchPage minimalBranchPage">
      <section className="heroCard branchHeroMinimal">
        <div className="brandMark">KPC</div>
        <h1>Kitchen Prep Control</h1>

        <div className="branchGrid branchGridMinimal">
          {activeBranches.map((branch) => (
            <button key={branch.id} className="branchCard branchCardMinimal" onClick={() => onEnterBranch(branch.id)} type="button">
              <strong>{branch.name}</strong>
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}

function BranchDashboard({ branch, onOpenPage, onSwitchBranch }) {
  const [menuOpen, setMenuOpen] = useState(false);

  const mainCards = [
    {
      key: "leftovers",
      title: "Current Leftovers",
      text: "View today’s leftover prep",
      tone: "green",
    },
    {
      key: "staff",
      title: "Update Prep",
      text: "Update quantities and prep progress",
      tone: "blue",
    },
  ];

  const menuCards = [
    {
      key: "assign",
      title: "Assign Prep",
      text: "Manager assigns what needs preparing",
    },
    {
      key: "setup",
      title: "Setup",
      text: "Manage items, units, branches and codes",
    },
  ];

  function goToPage(pageKey) {
    setMenuOpen(false);
    onOpenPage(pageKey);
  }

  return (
    <main className="landingPage secondLandingPage">
      <section className="landingPanel secondLandingPanel">
        <button
          className="boxHamburgerBtn"
          onClick={() => setMenuOpen((value) => !value)}
          type="button"
          aria-label="Open setup menu"
          aria-expanded={menuOpen}
        >
          ☰
        </button>

        {menuOpen && (
          <div className="boxMenuPanel">
            {menuCards.map((card) => (
              <button key={card.key} onClick={() => goToPage(card.key)} type="button">
                <strong>{card.title}</strong>
                <small>{card.text}</small>
              </button>
            ))}
          </div>
        )}

        <div className="chefIcon">KPC</div>
        <h1>{branch.name}</h1>
        <div className="datePill centered">Prep Date: {niceDate(todayISO())}</div>

        <div className="landingList landingListMainOnly">
          {mainCards.map((card) => (
            <button
              key={card.key}
              className={`homeOption ${card.tone}`}
              onClick={() => onOpenPage(card.key)}
              type="button"
            >
              <span>
                <strong>{card.title}</strong>
                <small>{card.text}</small>
              </span>
              <b>›</b>
            </button>
          ))}
        </div>
      </section>

      <button className="globalBackBtn" onClick={onSwitchBranch} type="button" aria-label="Go back">
        &lt;
      </button>
    </main>
  );
}

function categoryTone(name) {
  const key = name.toLowerCase();
  if (key.includes("sauce")) return "red";
  if (key.includes("fresh")) return "purple";
  if (key.includes("daal")) return "amber";
  if (key.includes("raw")) return "blue";
  return "green";
}

function SectionHeader({ title, tone = "green", children }) {
  return (
    <div className={`sectionHeader ${tone}`}>
      <div>
        <strong>{title}</strong>
      </div>
      {children}
    </div>
  );
}

function getDisplaySections(branch) {
  return branch.categories
    .filter((category) => category.active)
    .map((category) => ({
      id: category.id,
      label: category.name,
      category,
      items: category.items.filter((item) => item.active),
      tone: categoryTone(category.name),
    }))
    .filter((section) => section.items.length);
}

function CurrentLeftoversPage({ branch, onBack, unlocked, onUnlock, onNavigate }) {
  const [activeSection, setActiveSection] = useState("all");

  if (!unlocked) {
    return (
      <PageShell
        branch={branch}
        title="Current Leftovers"
        subtitle="Manager access required"
        onBack={onBack}
        activePage="leftovers"
        onNavigate={onNavigate}
      >
        <AccessGate
          title="Manager Code"
          description="Enter the manager code to view current leftover prep."
          expectedCode={branch.codes.manager}
          onUnlock={onUnlock}
        />
      </PageShell>
    );
  }

  const sections = getDisplaySections(branch);
  const visibleSections = activeSection === "all" ? sections : sections.filter((section) => section.id === activeSection);

  return (
    <PageShell
      branch={branch}
      title="Current Leftovers"
      subtitle="View what prep is left from the last batch"
      onBack={onBack}
      activePage="leftovers"
      onNavigate={onNavigate}
    >
      <div className="filterTabs">
        <button className={activeSection === "all" ? "active" : ""} onClick={() => setActiveSection("all")} type="button">All</button>
        {sections.map((section) => (
          <button
            key={section.id}
            className={activeSection === section.id ? `active ${section.tone}` : ""}
            onClick={() => setActiveSection(section.id)}
            type="button"
          >
            {section.label}
          </button>
        ))}
      </div>

      {visibleSections.map((section) => (
        <section className="dataPanel" key={section.id}>
          <SectionHeader title={section.label} tone={section.tone}>
            <span>{section.items.length} item{section.items.length === 1 ? "" : "s"}</span>
          </SectionHeader>
          <div className="responsiveTable cleanTable">
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Leftover</th>
                  <th>Unit</th>
                  <th>Prep Date</th>
                </tr>
              </thead>
              <tbody>
                {section.items.map((item) => {
                  const leftover = getLeftover(branch, item);
                  return (
                    <tr key={item.id}>
                      <td><strong>{item.name}</strong></td>
                      <td>{leftover.quantity || 0}</td>
                      <td>{leftover.unit || item.defaultUnit}</td>
                      <td>{leftover.prepDate ? niceDate(leftover.prepDate) : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      {!sections.length && <EmptyState title="No active items" text="Add categories and items from Prep List Setup." />}

      <div className="infoNote">Prep Date shows when the leftover batch was last updated.</div>
    </PageShell>
  );
}

function AssignPrepPage({ branch, updateBranch, onBack, unlocked, onUnlock, onNavigate }) {
  const activeItems = flattenItems(branch);
  const activeUnits = branch.units.filter((unit) => unit.active);
  const sections = getDisplaySections(branch);
  const [activeSection, setActiveSection] = useState("all");
  const [rows, setRows] = useState(() =>
    activeItems.map((item) => {
      const leftover = getLeftover(branch, item);
      return {
        itemId: item.id,
        categoryId: item.categoryId,
        target: "",
        finalAmount: "",
        unit: leftover.unit || item.defaultUnit,
        deadline: "15:00",
        notes: "",
      };
    })
  );

  useEffect(() => {
    setRows(
      activeItems.map((item) => {
        const leftover = getLeftover(branch, item);
        return {
          itemId: item.id,
          categoryId: item.categoryId,
          target: "",
          finalAmount: "",
          unit: leftover.unit || item.defaultUnit,
          deadline: "15:00",
          notes: "",
        };
      })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branch.id, branch.categories.length]);

  if (!unlocked) {
    return (
      <PageShell
        branch={branch}
        title="Assign Prep"
        subtitle="Manager access required"
        onBack={onBack}
        activePage="assign"
        onNavigate={onNavigate}
      >
        <AccessGate
          title="Manager Code"
          description="Enter the manager code to assign today’s prep."
          expectedCode={branch.codes.manager}
          onUnlock={onUnlock}
        />
      </PageShell>
    );
  }

  function updateRow(itemId, key, value) {
    setRows((prev) => prev.map((row) => (row.itemId === itemId ? { ...row, [key]: value } : row)));
  }

  function saveAssignments() {
    const date = todayISO();
    const newAssignments = rows
      .filter((row) => Number(row.finalAmount) > 0)
      .map((row) => {
        const item = activeItems.find((i) => i.id === row.itemId);
        const leftover = getLeftover(branch, item);
        const target = Number(row.target || 0);
        const leftoverQty = Number(leftover.quantity || 0);
        const suggested = Math.max(target - leftoverQty, 0);

        return {
          id: makeId("task"),
          date,
          itemId: row.itemId,
          itemName: item.name,
          categoryId: item.categoryId,
          categoryName: item.categoryName,
          leftoverQuantity: leftover.quantity || "0",
          leftoverUnit: leftover.unit || item.defaultUnit,
          target: row.target || "",
          suggested: Number.isFinite(suggested) ? String(suggested) : "",
          finalAmount: row.finalAmount,
          unit: row.unit,
          deadline: row.deadline,
          notes: row.notes,
          status: "Not Started",
        };
      });

    if (!newAssignments.length) {
      alert("Enter at least one manager assigned prep amount above 0.");
      return;
    }

    updateBranch({ ...branch, assignments: [...branch.assignments, ...newAssignments] });
    alert("Today’s prep assignments saved.");
  }

  function renderRows(items) {
    return items.map((item) => {
      const leftover = getLeftover(branch, item);
      const row = rows.find((r) => r.itemId === item.id) || {};
      const targetNumber = Number(row.target || 0);
      const leftNumber = Number(leftover.quantity || 0);
      const suggested = Math.max(targetNumber - leftNumber, 0);

      return (
        <tr key={item.id}>
          <td><strong>{item.name}</strong></td>
          <td>{leftover.quantity || 0}</td>
          <td>{leftover.unit || item.defaultUnit}</td>
          <td>
            <input value={row.target || ""} onChange={(e) => updateRow(item.id, "target", e.target.value)} type="number" min="0" step="0.25" placeholder="0" />
          </td>
          <td>{Number(row.target) > 0 ? suggested : "—"}</td>
          <td>
            <input value={row.finalAmount || ""} onChange={(e) => updateRow(item.id, "finalAmount", e.target.value)} type="number" min="0" step="0.25" placeholder="0" />
          </td>
          <td>
            <select value={row.unit || item.defaultUnit} onChange={(e) => updateRow(item.id, "unit", e.target.value)}>
              {activeUnits.map((unit) => <option key={unit.id} value={unit.name}>{unit.name}</option>)}
            </select>
          </td>
          <td><input value={row.deadline || ""} onChange={(e) => updateRow(item.id, "deadline", e.target.value)} type="time" /></td>
        </tr>
      );
    });
  }

  const visibleSections = activeSection === "all" ? sections : sections.filter((section) => section.id === activeSection);

  return (
    <PageShell
      branch={branch}
      title="Assign Prep"
      subtitle="Decide how much to prepare and assign staff"
      onBack={onBack}
      activePage="assign"
      onNavigate={onNavigate}
    >
      <div className="toolbarLine">
        <div className="filterTabs compact">
          <button className={activeSection === "all" ? "active" : ""} onClick={() => setActiveSection("all")} type="button">All</button>
          {sections.map((section) => (
            <button key={section.id} className={activeSection === section.id ? `active ${section.tone}` : ""} onClick={() => setActiveSection(section.id)} type="button">
              {section.label}
            </button>
          ))}
        </div>
        <Button onClick={saveAssignments}>Save All</Button>
      </div>

      {visibleSections.map((section) => (
        <section className="dataPanel" key={section.id}>
          <SectionHeader title={section.label} tone={section.tone}>
            <span>Suggested Prep = Target Need - Current Leftover</span>
          </SectionHeader>
          <div className="responsiveTable cleanTable assignmentTable">
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Leftover</th>
                  <th>Unit</th>
                  <th>Target Need</th>
                  <th>Suggested Prep</th>
                  <th>Manager Assigns</th>
                  <th>Assign Unit</th>
                  <th>Deadline</th>
                </tr>
              </thead>
              <tbody>{renderRows(section.items)}</tbody>
            </table>
          </div>
        </section>
      ))}

      <div className="infoNote">Suggested Prep = Target Need - Current Leftover (Usable)</div>
    </PageShell>
  );
}

function StaffUpdatePage({ branch, updateBranch, onBack, unlocked, onUnlock, onNavigate }) {
  const activeItems = flattenItems(branch);
  const activeUnits = branch.units.filter((unit) => unit.active);
  const [leftoverDrafts, setLeftoverDrafts] = useState({});
  const [activeTab, setActiveTab] = useState("leftovers");

  useEffect(() => {
    const draft = {};
    activeItems.forEach((item) => {
      draft[item.id] = getLeftover(branch, item);
    });
    setLeftoverDrafts(draft);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branch.id, branch.leftovers]);

  if (!unlocked) {
    return (
      <PageShell
        branch={branch}
        title="Update Prep"
        subtitle="Kitchen staff access required"
        onBack={onBack}
        activePage="staff"
        onNavigate={onNavigate}
      >
        <AccessGate
          title="Staff Code"
          description="Enter the staff code to update leftover quantity and task progress."
          expectedCode={branch.codes.staff}
          onUnlock={onUnlock}
        />
      </PageShell>
    );
  }

  function updateDraft(itemId, key, value) {
    setLeftoverDrafts((prev) => ({
      ...prev,
      [itemId]: {
        ...(prev[itemId] || {}),
        [key]: value,
      },
    }));
  }

  function saveLeftovers() {
    updateBranch({
      ...branch,
      leftovers: {
        ...branch.leftovers,
        ...leftoverDrafts,
      },
    });
    alert("Leftover prep updated.");
  }

  function updateTaskStatus(taskId, status) {
    updateBranch({
      ...branch,
      assignments: branch.assignments.map((task) => (task.id === taskId ? { ...task, status } : task)),
    });
  }

  const todayTasks = branch.assignments.filter((task) => task.date === todayISO());

  function renderCategoryRows(category) {
    const categoryItems = category.items.filter((item) => item.active);

    function rowsFor(items) {
      return items.map((item) => {
        const draft = leftoverDrafts[item.id] || getLeftover(branch, item);
        return (
          <tr key={item.id}>
            <td>
              <strong>{item.name}</strong>
              <small>{category.name}</small>
            </td>
            <td>
              <input
                value={draft.quantity || ""}
                onChange={(e) => updateDraft(item.id, "quantity", e.target.value)}
                type="number"
                min="0"
                step="0.25"
                placeholder="0"
              />
            </td>
            <td>
              <select value={draft.unit || item.defaultUnit} onChange={(e) => updateDraft(item.id, "unit", e.target.value)}>
                {activeUnits.map((unit) => (
                  <option key={unit.id} value={unit.name}>
                    {unit.name}
                  </option>
                ))}
              </select>
            </td>
            <td>
              <input
                value={draft.prepDate || todayISO()}
                onChange={(e) => updateDraft(item.id, "prepDate", e.target.value)}
                type="date"
              />
            </td>
            <td>
              <input
                value={draft.note || ""}
                onChange={(e) => updateDraft(item.id, "note", e.target.value)}
                placeholder="Optional note"
              />
            </td>
          </tr>
        );
      });
    }

    if (!categoryItems.length) return null;

    return (
      <section className="panel staffPanel" key={category.id}>
        <div className="panelHeader">
          <h2>{category.name}</h2>
          <span>Modify quantity and unit</span>
        </div>
        <div className="responsiveTable staffTable">
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Qty</th>
                <th>Unit</th>
                <th>Date</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>{rowsFor(categoryItems)}</tbody>
          </table>
        </div>
      </section>
    );
  }

  return (
    <PageShell
      branch={branch}
      title="Update Prep"
      subtitle="Update leftovers from last batch"
      onBack={onBack}
      activePage="staff"
      onNavigate={onNavigate}
    >
      <div className="summaryCards">
        {getDisplaySections(branch).map((section) => (
          <button
            key={section.id}
            type="button"
            className={`summaryCard ${section.tone}`}
            onClick={() => setActiveTab("leftovers")}
          >
            <strong>{section.items.length}</strong>
            <span>{section.label}</span>
          </button>
        ))}
      </div>

      <div className="tabRow cleanTabs">
        <button className={activeTab === "leftovers" ? "active" : ""} onClick={() => setActiveTab("leftovers")} type="button">
          Update Leftovers
        </button>
        <button className={activeTab === "tasks" ? "active" : ""} onClick={() => setActiveTab("tasks")} type="button">
          My Tasks
        </button>
      </div>

      {activeTab === "leftovers" && (
        <>
          <div className="notice">No condition field. No updated-by field. Use prep date to track which batch is old.</div>
          {branch.categories.filter((c) => c.active).map(renderCategoryRows)}
          <div className="stickySave">
            <Button onClick={saveLeftovers}>Save Leftover Updates</Button>
          </div>
        </>
      )}

      {activeTab === "tasks" && (
        <section className="panel">
          <div className="panelHeader">
            <h2>Today’s prep tasks</h2>
            <span>{todayTasks.length} tasks</span>
          </div>
          {!todayTasks.length ? (
            <EmptyState title="No tasks today" text="The manager has not assigned any prep tasks yet." />
          ) : (
            <div className="taskGrid">
              {todayTasks.map((task) => (
                <div key={task.id} className="taskCard">
                  <span className="taskStatus">{task.status}</span>
                  <strong>{task.itemName}</strong>
                  <p>
                    Prepare {task.finalAmount} {task.unit}
                  </p>
                  <small>
                    {task.categoryName} · Deadline {task.deadline || "not set"}
                  </small>
                  <select value={task.status} onChange={(e) => updateTaskStatus(task.id, e.target.value)}>
                    <option>Not Started</option>
                    <option>Started</option>
                    <option>Half Done</option>
                    <option>Completed</option>
                    <option>Problem</option>
                  </select>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </PageShell>
  );
}

function SetupPage({ appData, setAppData, branch, updateBranch, onBack, unlocked, onUnlock, onNavigate }) {
  const [activeSection, setActiveSection] = useState("codes");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newUnitName, setNewUnitName] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState(branch.categories[0]?.id || "");
  const [newItemName, setNewItemName] = useState("");
  const [newItemUnit, setNewItemUnit] = useState(branch.units.find((u) => u.active)?.name || "");
  const [codesDraft, setCodesDraft] = useState({ ...branch.codes });
  const [currentSetupCode, setCurrentSetupCode] = useState("");
  const [ownerCodeDraft, setOwnerCodeDraft] = useState(appData.ownerCode);
  const [currentOwnerCode, setCurrentOwnerCode] = useState("");
  const [newBranchName, setNewBranchName] = useState("");
  const [newShortCode, setNewShortCode] = useState("");
  const [copyFromId, setCopyFromId] = useState(branch.id);

  useEffect(() => {
    setCodesDraft({ ...branch.codes });
    setOwnerCodeDraft(appData.ownerCode);
    setSelectedCategoryId(branch.categories[0]?.id || "");
  }, [branch.id, appData.ownerCode]);

  if (!unlocked) {
    return (
      <PageShell
        branch={branch}
        title="Setup"
        subtitle="Setup/admin access required"
        onBack={onBack}
        activePage="setup"
        onNavigate={onNavigate}
      >
        <AccessGate
          title="Setup Code"
          description="Enter the setup code to manage categories, items, units and access codes."
          expectedCode={branch.codes.setup}
          onUnlock={onUnlock}
        />
      </PageShell>
    );
  }

  function saveAccessCodes() {
    if (codesDraft.setup !== branch.codes.setup && currentSetupCode !== branch.codes.setup) {
      alert("To change the setup/admin code, enter the current setup code first.");
      return;
    }

    if (ownerCodeDraft !== appData.ownerCode && currentOwnerCode !== appData.ownerCode) {
      alert("To change the owner/master code, enter the current owner code first.");
      return;
    }

    updateBranch({ ...branch, codes: { ...codesDraft } });
    if (ownerCodeDraft !== appData.ownerCode) {
      setAppData((prev) => ({ ...prev, ownerCode: ownerCodeDraft }));
    }
    alert("Access codes updated.");
  }

  function addCategory(e) {
    e.preventDefault();
    const name = newCategoryName.trim();
    if (!name) return;
    if (branch.categories.some((cat) => cat.name.toLowerCase() === name.toLowerCase())) {
      alert("This category already exists.");
      return;
    }
    const newCategory = { id: makeId("cat"), name, active: true, items: [] };
    updateBranch({ ...branch, categories: [...branch.categories, newCategory] });
    setNewCategoryName("");
    setSelectedCategoryId(newCategory.id);
  }

  function updateCategory(categoryId, updates) {
    updateBranch({
      ...branch,
      categories: branch.categories.map((cat) => (cat.id === categoryId ? { ...cat, ...updates } : cat)),
    });
  }

  function addUnit(e) {
    e.preventDefault();
    const name = newUnitName.trim();
    if (!name) return;
    if (branch.units.some((unit) => unit.name.toLowerCase() === name.toLowerCase())) {
      alert("This unit already exists.");
      return;
    }
    updateBranch({
      ...branch,
      units: [...branch.units, { id: makeId("unit"), name, active: true }],
    });
    setNewUnitName("");
  }

  function updateUnit(unitId, updates) {
    updateBranch({
      ...branch,
      units: branch.units.map((unit) => (unit.id === unitId ? { ...unit, ...updates } : unit)),
    });
  }

  function addItem(e) {
    e.preventDefault();
    const name = newItemName.trim();
    if (!name || !selectedCategoryId) return;

    const selectedCategory = branch.categories.find((cat) => cat.id === selectedCategoryId);
    if (selectedCategory.items.some((item) => item.name.toLowerCase() === name.toLowerCase())) {
      alert("This item already exists in this category.");
      return;
    }

    const item = {
      id: makeId("item"),
      name,
      defaultUnit: newItemUnit || branch.units[0]?.name || "",
      active: true,
      separate: false,
    };

    updateBranch({
      ...branch,
      categories: branch.categories.map((cat) =>
        cat.id === selectedCategoryId ? { ...cat, items: [...cat.items, item] } : cat
      ),
    });
    setNewItemName("");
  }

  function updateItem(categoryId, itemId, updates) {
    updateBranch({
      ...branch,
      categories: branch.categories.map((cat) =>
        cat.id === categoryId
          ? { ...cat, items: cat.items.map((item) => (item.id === itemId ? { ...item, ...updates } : item)) }
          : cat
      ),
    });
  }

  function addBranchFromSetup(e) {
    e.preventDefault();
    if (currentOwnerCode !== appData.ownerCode) {
      alert("Enter the current owner/master code to add a branch.");
      return;
    }
    const cleanName = newBranchName.trim();
    const cleanShortCode = newShortCode.trim().toUpperCase();
    if (!cleanName || !cleanShortCode) {
      alert("Add branch name and short code.");
      return;
    }
    if (appData.branches.some((b) => b.name.toLowerCase() === cleanName.toLowerCase())) {
      alert("This branch already exists.");
      return;
    }
    const source = appData.branches.find((b) => b.id === copyFromId) || branch;
    const newBranch = cloneBranchSetup(source, cleanName, cleanShortCode);
    setAppData((prev) => ({ ...prev, branches: [...prev.branches, newBranch] }));
    setNewBranchName("");
    setNewShortCode("");
    alert(`${cleanName} branch added.`);
  }

  function toggleBranch(branchId) {
    setAppData((prev) => ({
      ...prev,
      branches: prev.branches.map((b) => (b.id === branchId ? { ...b, active: !b.active } : b)),
    }));
  }

  const activeUnits = branch.units.filter((unit) => unit.active);

  return (
    <PageShell
      branch={branch}
      title="Setup"
      subtitle="Update the system without changing code: categories, items, units, branches and codes."
      onBack={onBack}
      activePage="setup"
      onNavigate={onNavigate}
    >
      <div className="tabRow wrapTabs">
        <button className={activeSection === "codes" ? "active" : ""} onClick={() => setActiveSection("codes")}>Access Codes</button>
        <button className={activeSection === "categories" ? "active" : ""} onClick={() => setActiveSection("categories")}>Categories</button>
        <button className={activeSection === "items" ? "active" : ""} onClick={() => setActiveSection("items")}>Items</button>
        <button className={activeSection === "units" ? "active" : ""} onClick={() => setActiveSection("units")}>Units</button>
        <button className={activeSection === "branches" ? "active" : ""} onClick={() => setActiveSection("branches")}>Branches</button>
      </div>

      {activeSection === "codes" && (
        <section className="panel">
          <div className="panelHeader">
            <h2>Access Codes</h2>
            <span>Editable from setup</span>
          </div>
          <div className="formGrid">
            <TextInput label="Staff Prep Update Code" value={codesDraft.staff} onChange={(e) => setCodesDraft({ ...codesDraft, staff: e.target.value })} />
            <TextInput label="Manager Code" value={codesDraft.manager} onChange={(e) => setCodesDraft({ ...codesDraft, manager: e.target.value })} />
            <TextInput label="Setup/Admin Code" value={codesDraft.setup} onChange={(e) => setCodesDraft({ ...codesDraft, setup: e.target.value })} />
            <TextInput label="Current Setup Code required if changing setup code" type="password" value={currentSetupCode} onChange={(e) => setCurrentSetupCode(e.target.value)} />
            <TextInput label="Owner/Master Code" value={ownerCodeDraft} onChange={(e) => setOwnerCodeDraft(e.target.value)} />
            <TextInput label="Current Owner Code required if changing owner code" type="password" value={currentOwnerCode} onChange={(e) => setCurrentOwnerCode(e.target.value)} />
          </div>
          <Button onClick={saveAccessCodes}>Save Access Codes</Button>
          <div className="notice smallNotice">
            Default owner code is OWNER2026. Change it after deployment and keep it safe.
          </div>
        </section>
      )}

      {activeSection === "categories" && (
        <section className="panel">
          <div className="panelHeader">
            <h2>Manage Categories</h2>
            <span>Add, rename, delist or restore</span>
          </div>
          <form className="inlineForm" onSubmit={addCategory}>
            <input value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder="New category name, e.g. Rice Prep" />
            <Button type="submit">Add Category</Button>
          </form>
          <div className="listStack">
            {branch.categories.map((category) => (
              <div className="setupRow" key={category.id}>
                <input value={category.name} onChange={(e) => updateCategory(category.id, { name: e.target.value })} />
                <span className={category.active ? "statusActive" : "statusOff"}>{category.active ? "Active" : "Delisted"}</span>
                <Button variant="ghost" onClick={() => updateCategory(category.id, { active: !category.active })}>
                  {category.active ? "Delist" : "Restore"}
                </Button>
              </div>
            ))}
          </div>
        </section>
      )}

      {activeSection === "items" && (
        <section className="panel">
          <div className="panelHeader">
            <h2>Manage Items</h2>
            <span>Add, edit or delist prep items</span>
          </div>
          <form className="formGrid addItemForm" onSubmit={addItem}>
            <SelectInput label="Category" value={selectedCategoryId} onChange={(e) => setSelectedCategoryId(e.target.value)}>
              {branch.categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </SelectInput>
            <TextInput label="Item Name" value={newItemName} onChange={(e) => setNewItemName(e.target.value)} placeholder="Example: Pilau Rice" />
            <SelectInput label="Default Unit" value={newItemUnit} onChange={(e) => setNewItemUnit(e.target.value)}>
              {activeUnits.map((unit) => (
                <option key={unit.id} value={unit.name}>{unit.name}</option>
              ))}
            </SelectInput>
            <Button type="submit">Add Item</Button>
          </form>

          <div className="setupCategoryStack">
            {branch.categories.map((category) => (
              <div className="setupCategory" key={category.id}>
                <h3>{category.name}</h3>
                {!category.items.length && <p className="muted">No items yet.</p>}
                {category.items.map((item) => (
                  <div className="setupRow itemSetupRow" key={item.id}>
                    <input value={item.name} onChange={(e) => updateItem(category.id, item.id, { name: e.target.value })} />
                    <select value={item.defaultUnit} onChange={(e) => updateItem(category.id, item.id, { defaultUnit: e.target.value })}>
                      {activeUnits.map((unit) => (
                        <option key={unit.id} value={unit.name}>{unit.name}</option>
                      ))}
                    </select>
                    <span className={item.active ? "statusActive" : "statusOff"}>{item.active ? "Active" : "Delisted"}</span>
                    <Button variant="ghost" onClick={() => updateItem(category.id, item.id, { active: !item.active })}>
                      {item.active ? "Delist" : "Restore"}
                    </Button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </section>
      )}

      {activeSection === "units" && (
        <section className="panel">
          <div className="panelHeader">
            <h2>Kitchen Units</h2>
            <span>Used in scroll/dropdown menus</span>
          </div>
          <form className="inlineForm" onSubmit={addUnit}>
            <input value={newUnitName} onChange={(e) => setNewUnitName(e.target.value)} placeholder="New unit, e.g. Large tray" />
            <Button type="submit">Add Unit</Button>
          </form>
          <div className="listStack">
            {branch.units.map((unit) => (
              <div className="setupRow" key={unit.id}>
                <input value={unit.name} onChange={(e) => updateUnit(unit.id, { name: e.target.value })} />
                <span className={unit.active ? "statusActive" : "statusOff"}>{unit.active ? "Active" : "Delisted"}</span>
                <Button variant="ghost" onClick={() => updateUnit(unit.id, { active: !unit.active })}>
                  {unit.active ? "Delist" : "Restore"}
                </Button>
              </div>
            ))}
          </div>
        </section>
      )}

      {activeSection === "branches" && (
        <section className="panel">
          <div className="panelHeader">
            <h2>Manage Branches</h2>
            <span>Add future branches</span>
          </div>
          <form className="formGrid" onSubmit={addBranchFromSetup}>
            <TextInput label="Current Owner Code" type="password" value={currentOwnerCode} onChange={(e) => setCurrentOwnerCode(e.target.value)} />
            <TextInput label="New Branch Name" value={newBranchName} onChange={(e) => setNewBranchName(e.target.value)} placeholder="Example: Dartford" />
            <TextInput label="Short Code" value={newShortCode} onChange={(e) => setNewShortCode(e.target.value)} placeholder="Example: DAR" />
            <SelectInput label="Copy setup from" value={copyFromId} onChange={(e) => setCopyFromId(e.target.value)}>
              {appData.branches.map((branchOption) => (
                <option key={branchOption.id} value={branchOption.id}>{branchOption.name}</option>
              ))}
            </SelectInput>
            <Button type="submit">Add Future Branch</Button>
          </form>

          <div className="listStack branchSetupList">
            {appData.branches.map((branchOption) => (
              <div className="setupRow" key={branchOption.id}>
                <strong>{branchOption.name}</strong>
                <span>{branchOption.shortCode}</span>
                <span className={branchOption.active ? "statusActive" : "statusOff"}>{branchOption.active ? "Active" : "Delisted"}</span>
                <Button variant="ghost" onClick={() => toggleBranch(branchOption.id)}>
                  {branchOption.active ? "Delist" : "Restore"}
                </Button>
              </div>
            ))}
          </div>
        </section>
      )}
    </PageShell>
  );
}

export default function App() {
  const [appData, setAppData] = useState(loadData);
  const [selectedBranchId, setSelectedBranchId] = useState(null);
  const [page, setPage] = useState("branchEntry");
  const [unlocked, setUnlocked] = useState({ manager: false, staff: false, setup: false });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
  }, [appData]);

  const selectedBranch = useMemo(
    () => appData.branches.find((branch) => branch.id === selectedBranchId),
    [appData.branches, selectedBranchId]
  );

  function updateBranch(updatedBranch) {
    setAppData((prev) => ({
      ...prev,
      branches: prev.branches.map((branch) => (branch.id === updatedBranch.id ? updatedBranch : branch)),
    }));
  }

  function enterBranch(branchId) {
    setSelectedBranchId(branchId);
    setPage("dashboard");
    setUnlocked({ manager: false, staff: false, setup: false });
  }

  function switchBranch() {
    setSelectedBranchId(null);
    setPage("branchEntry");
    setUnlocked({ manager: false, staff: false, setup: false });
  }

  if (page === "branchEntry" || !selectedBranch) {
    return <BranchEntryPage appData={appData} setAppData={setAppData} onEnterBranch={enterBranch} />;
  }

  if (page === "dashboard") {
    return <BranchDashboard branch={selectedBranch} onOpenPage={setPage} onSwitchBranch={switchBranch} />;
  }

  if (page === "leftovers") {
    return (
      <CurrentLeftoversPage
        branch={selectedBranch}
        onBack={() => setPage("dashboard")}
        unlocked={unlocked.manager}
        onUnlock={() => setUnlocked((prev) => ({ ...prev, manager: true }))}
        onNavigate={setPage}
      />
    );
  }

  if (page === "assign") {
    return (
      <AssignPrepPage
        branch={selectedBranch}
        updateBranch={updateBranch}
        onBack={() => setPage("dashboard")}
        unlocked={unlocked.manager}
        onUnlock={() => setUnlocked((prev) => ({ ...prev, manager: true }))}
        onNavigate={setPage}
      />
    );
  }

  if (page === "staff") {
    return (
      <StaffUpdatePage
        branch={selectedBranch}
        updateBranch={updateBranch}
        onBack={() => setPage("dashboard")}
        unlocked={unlocked.staff}
        onUnlock={() => setUnlocked((prev) => ({ ...prev, staff: true }))}
        onNavigate={setPage}
      />
    );
  }

  if (page === "setup") {
    return (
      <SetupPage
        appData={appData}
        setAppData={setAppData}
        branch={selectedBranch}
        updateBranch={updateBranch}
        onBack={() => setPage("dashboard")}
        unlocked={unlocked.setup}
        onUnlock={() => setUnlocked((prev) => ({ ...prev, setup: true }))}
        onNavigate={setPage}
      />
    );
  }

  return null;
}
