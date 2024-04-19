export default function Container({ children }: { children: React.ReactNode }) {
  return (
    <div className="container mx-auto sm:px-6 lg:px-8 relative overflow-hidden">
      {children}
    </div>
  );
}
