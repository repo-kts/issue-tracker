import {
  Document,
  Image,
  Link,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";

type Attachment = {
  id: string;
  kind: string;
  filename: string;
  storedPath: string;
  mimeType: string;
  sizeBytes: number;
  imageData?: Buffer; // pre-loaded for embedding (image kind only)
};

type Message = {
  id: string;
  authorType: "owner" | "client";
  authorName: string;
  body: string;
  createdAt: Date;
  attachments?: Attachment[];
};

export type IssuePdfData = {
  project: {
    name: string;
    clientName: string;
    clientEmail: string | null;
    projectUrl: string | null;
    brandColor: string | null;
  };
  issue: {
    iterationNumber: number;
    title: string;
    description: string;
    status: string;
    priority: string;
    submitterName: string | null;
    createdAt: Date;
    etaAt: Date | null;
    resolvedAt: Date | null;
    clientApprovedAt: Date | null;
    clientApprovedBy: string | null;
  };
  attachments: Attachment[];
  messages: Message[];
  generatedAt: Date;
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 32,
    paddingBottom: 36,
    paddingHorizontal: 36,
    fontSize: 10,
    lineHeight: 1.5,
    fontFamily: "Helvetica",
    color: "#111",
  },
  brandStrip: {
    height: 4,
    marginBottom: 14,
  },
  smallLabel: {
    fontSize: 7.5,
    color: "#666",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 3,
  },
  projectName: {
    fontSize: 11,
    color: "#444",
    marginBottom: 2,
  },
  title: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  metaLabel: {
    width: 90,
    color: "#666",
    fontSize: 9,
  },
  metaValue: {
    fontSize: 9,
    flex: 1,
  },
  pill: {
    fontSize: 8,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: "#aaa",
    marginRight: 6,
  },
  sectionHeader: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#555",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginTop: 18,
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: "#ddd",
  },
  body: {
    fontSize: 10,
    color: "#222",
  },
  attachmentGroupLabel: {
    fontSize: 9,
    color: "#666",
    marginTop: 8,
    marginBottom: 4,
  },
  imageGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  imageItem: {
    width: 150,
    marginBottom: 8,
    borderWidth: 0.5,
    borderColor: "#ddd",
  },
  imageItemImg: {
    width: 150,
    height: 100,
    objectFit: "cover",
  },
  imageCaption: {
    fontSize: 7,
    color: "#666",
    padding: 3,
  },
  fileLine: {
    fontSize: 9.5,
    padding: 5,
    backgroundColor: "#f5f5f7",
    marginBottom: 4,
    borderWidth: 0.5,
    borderColor: "#e0e0e3",
    borderRadius: 3,
  },
  linkLine: {
    fontSize: 9.5,
    color: "#1a73e8",
    marginBottom: 4,
  },
  messageBlock: {
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: "#eee",
  },
  messageMeta: {
    fontSize: 8.5,
    color: "#666",
    marginBottom: 3,
  },
  messageAuthor: {
    fontFamily: "Helvetica-Bold",
    color: "#222",
  },
  messageBody: {
    fontSize: 10,
    color: "#222",
  },
  footer: {
    position: "absolute",
    bottom: 18,
    left: 36,
    right: 36,
    fontSize: 7,
    color: "#999",
    flexDirection: "row",
    justifyContent: "space-between",
  },
});

export function IssuePdf({ data }: { data: IssuePdfData }) {
  const { project, issue, attachments, messages, generatedAt } = data;
  const brand = project.brandColor ?? "#f97316";

  const images = attachments.filter((a) => a.kind === "image" && a.imageData);
  const videos = attachments.filter((a) => a.kind === "video");
  const audios = attachments.filter((a) => a.kind === "audio");
  const files = attachments.filter((a) => a.kind === "file");
  const links = attachments.filter((a) => a.kind === "link");

  return (
    <Document
      title={`${project.name} #${issue.iterationNumber} — ${issue.title}`}
      author={project.clientName}
    >
      <Page size="A4" style={styles.page}>
        <View style={[styles.brandStrip, { backgroundColor: brand }]} />

        <Text style={styles.smallLabel}>Change request</Text>
        <Text style={styles.projectName}>{project.name}</Text>
        <Text style={styles.title}>
          #{issue.iterationNumber} · {issue.title}
        </Text>

        <View style={{ flexDirection: "row", marginBottom: 12 }}>
          <Text style={styles.pill}>{statusLabel(issue.status)}</Text>
          {issue.priority !== "normal" && (
            <Text style={styles.pill}>{prio(issue.priority)} priority</Text>
          )}
          {issue.clientApprovedAt && (
            <Text style={styles.pill}>Approved by client</Text>
          )}
        </View>

        <MetaRow label="Client" value={project.clientName} />
        {project.clientEmail && (
          <MetaRow label="Client email" value={project.clientEmail} />
        )}
        {project.projectUrl && (
          <MetaRow label="Project URL" value={project.projectUrl} />
        )}
        <MetaRow
          label="Submitted by"
          value={issue.submitterName ?? project.clientName}
        />
        <MetaRow label="Opened" value={formatDate(issue.createdAt)} />
        {issue.etaAt && <MetaRow label="ETA" value={formatDate(issue.etaAt)} />}
        {issue.resolvedAt && (
          <MetaRow label="Resolved" value={formatDate(issue.resolvedAt)} />
        )}
        {issue.clientApprovedAt && (
          <MetaRow
            label="Approved at"
            value={`${formatDate(issue.clientApprovedAt)}${
              issue.clientApprovedBy ? ` by ${issue.clientApprovedBy}` : ""
            }`}
          />
        )}

        {issue.description ? (
          <>
            <Text style={styles.sectionHeader}>Original request</Text>
            <Text style={styles.body}>{issue.description}</Text>
          </>
        ) : null}

        {attachments.length > 0 && (
          <>
            <Text style={styles.sectionHeader}>
              Attachments ({attachments.length})
            </Text>

            {images.length > 0 && (
              <>
                <Text style={styles.attachmentGroupLabel}>
                  Screenshots ({images.length})
                </Text>
                <View style={styles.imageGrid}>
                  {images.map((a) => (
                    <View key={a.id} style={styles.imageItem}>
                      {a.imageData ? (
                        <Image
                          src={{ data: a.imageData, format: imageFormat(a.mimeType) }}
                          style={styles.imageItemImg}
                        />
                      ) : null}
                      <Text style={styles.imageCaption}>{a.filename}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            {videos.length > 0 && (
              <>
                <Text style={styles.attachmentGroupLabel}>
                  Screen recordings ({videos.length})
                </Text>
                {videos.map((a) => (
                  <Text key={a.id} style={styles.fileLine}>
                    🎬 {a.filename} ({formatSize(a.sizeBytes)})
                  </Text>
                ))}
              </>
            )}

            {audios.length > 0 && (
              <>
                <Text style={styles.attachmentGroupLabel}>
                  Voice notes ({audios.length})
                </Text>
                {audios.map((a) => (
                  <Text key={a.id} style={styles.fileLine}>
                    🎙 {a.filename} ({formatSize(a.sizeBytes)})
                  </Text>
                ))}
              </>
            )}

            {files.length > 0 && (
              <>
                <Text style={styles.attachmentGroupLabel}>
                  Files ({files.length})
                </Text>
                {files.map((a) => (
                  <Text key={a.id} style={styles.fileLine}>
                    📎 {a.filename} ({formatSize(a.sizeBytes)})
                  </Text>
                ))}
              </>
            )}

            {links.length > 0 && (
              <>
                <Text style={styles.attachmentGroupLabel}>
                  Reference links ({links.length})
                </Text>
                {links.map((a) => (
                  <View key={a.id} style={{ marginBottom: 4 }}>
                    {a.filename && a.filename !== a.storedPath && (
                      <Text style={{ fontSize: 9 }}>{a.filename}</Text>
                    )}
                    <Link src={a.storedPath} style={styles.linkLine}>
                      {a.storedPath}
                    </Link>
                  </View>
                ))}
              </>
            )}
          </>
        )}

        {messages.length > 0 && (
          <>
            <Text style={styles.sectionHeader}>
              Conversation ({messages.length} message{messages.length === 1 ? "" : "s"})
            </Text>
            {messages.map((m) => (
              <View key={m.id} style={styles.messageBlock} wrap={false}>
                <Text style={styles.messageMeta}>
                  <Text style={styles.messageAuthor}>{m.authorName}</Text>
                  {m.authorType === "owner" && " (agency)"} · {formatDate(m.createdAt)}
                </Text>
                {m.body ? <Text style={styles.messageBody}>{m.body}</Text> : null}
                {m.attachments && m.attachments.length > 0 && (
                  <View style={{ marginTop: 4 }}>
                    {m.attachments.map((a) => (
                      <Text key={a.id} style={{ fontSize: 8.5, color: "#666" }}>
                        {a.kind === "link" ? "🔗 " : "📎 "}
                        {a.filename}
                        {a.kind === "link" && a.storedPath !== a.filename
                          ? ` (${a.storedPath})`
                          : ""}
                      </Text>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </>
        )}

        <View style={styles.footer} fixed>
          <Text>
            issueTracker · Generated {formatDate(generatedAt)}
          </Text>
          <Text
            render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaRow}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

function statusLabel(status: string): string {
  return (
    ({
      open: "Open",
      in_progress: "In progress",
      resolved: "Resolved",
      rejected: "Declined",
    } as Record<string, string>)[status] ?? status
  );
}

function prio(p: string): string {
  return (
    ({ low: "Low", high: "High", urgent: "Urgent" } as Record<string, string>)[p] ?? p
  );
}

function formatDate(d: Date): string {
  return d.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function imageFormat(mime: string): "png" | "jpg" {
  if (mime.includes("png")) return "png";
  return "jpg";
}
