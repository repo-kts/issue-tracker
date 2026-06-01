"use server";

import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { payments, projects } from "@/lib/db/schema";
import { getProjectBySlug } from "@/lib/projects";
import { createRazorpayOrder, verifyRazorpaySignature } from "@/lib/razorpay";

export async function createOrderAction(slug: string, amountPaise: number) {
  const project = await getProjectBySlug(slug);
  if (!project) throw new Error("Project not found");

  const paymentId = nanoid(21);
  const order = await createRazorpayOrder(amountPaise, paymentId);

  await db.insert(payments).values({
    id: paymentId,
    projectId: project.id,
    razorpayOrderId: order.id,
    amountPaise,
    iterationsPurchased: 1,
    status: "created",
  });

  return {
    paymentId,
    orderId: order.id,
    amount: order.amount,
    keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? process.env.RAZORPAY_KEY_ID!,
    clientName: project.clientName,
    projectName: project.name,
  };
}

export async function verifyPaymentAction(args: {
  slug: string;
  paymentId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}) {
  const project = await getProjectBySlug(args.slug);
  if (!project) throw new Error("Project not found");

  const ok = verifyRazorpaySignature(
    args.razorpayOrderId,
    args.razorpayPaymentId,
    args.razorpaySignature,
  );
  if (!ok) throw new Error("Signature verification failed");

  // Mark this payment as paid and grant 1 more iteration.
  await db
    .update(payments)
    .set({
      status: "paid",
      razorpayPaymentId: args.razorpayPaymentId,
      paidAt: new Date(),
    })
    .where(eq(payments.id, args.paymentId));

  await db
    .update(projects)
    .set({ paidIterations: sql`${projects.paidIterations} + 1` })
    .where(eq(projects.id, project.id));

  revalidatePath(`/p/${args.slug}`);
  revalidatePath(`/dashboard/projects/${project.id}`);
  return { success: true };
}
