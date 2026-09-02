function Loading({ message }) {
  return (
    <section className="loading">
      <div className="spinner"></div>
      <h2>{message}</h2>
    </section>
  );
}

export default Loading;
