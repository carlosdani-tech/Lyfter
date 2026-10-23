function Loading({ message }) {
  return (
    <section className="loading" role="status" aria-live="polite" aria-busy="true">
      <div className="spinner" aria-hidden="true"></div>
      <h2>{message}</h2>
    </section>
  );
}

export default Loading;
