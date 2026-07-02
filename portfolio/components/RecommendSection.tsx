const recommendations = [
  {
    title: "Refactoring UI",
    note: "Practical interface design for developers.",
  },
  {
    title: "The Design of Everyday Things",
    note: "Foundations of human-centered design.",
  },
  {
    title: "Steal Like an Artist",
    note: "Creative process and inspiration.",
  },
];

export function RecommendSection() {
  return (
    <section className="recommend-section">
      <h2 className="recommend-heading">RECOMMEND READING</h2>
      <ul className="recommend-list">
        {recommendations.map((book) => (
          <li key={book.title}>
            <p className="recommend-title">{book.title}</p>
            <p className="recommend-note">{book.note}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
