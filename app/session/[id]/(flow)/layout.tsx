import { Shell } from "@/components/Shell";
import { SplitLayout } from "@/components/SplitLayout";
import { DreamRawPanel } from "@/components/DreamRawPanel";

export default async function SessionFlowLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <Shell title="Álom feldolgozása" space="dream">
      <SplitLayout
        leftTitle="Nyers álom"
        left={
          <div
            className="raw-tile"
            style={{
              background: `linear-gradient(135deg,
                var(--evening-card-paper-strong) 0%,
                var(--evening-card-paper) 42%,
                var(--accent) 112%)`,
                opacity: 0.92,
            }}
          >
            <DreamRawPanel sessionId={id} />
          </div>
        }
        rightTitle=""
        right={<div className="right-wrap">{children}</div>}
      />

      <style jsx>{`
        .raw-tile {
          border-radius: 18px;
          border: 1px solid var(--line-soft);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.12);
          padding: 18px;
          min-height: 220px;
        }

        .right-wrap {
          min-width: 0;
        }

        /* ha a SplitLayout-od megjeleníti a rightTitle-t üresen is,
           akkor ezt megtehetjük később: rightTitle propot opcionálissá tesszük */
      `}</style>
    </Shell>
  );
}
