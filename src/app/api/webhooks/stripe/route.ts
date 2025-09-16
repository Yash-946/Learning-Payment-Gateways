import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { connectDB } from "@/lib/mongodb";
import Purchase from "@/models/Purchase";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET as string;

export async function POST(request: NextRequest) {
  console.log("Stripe webhook received");
  
  const body = await request.text();
  const signature = request.headers.get("stripe-signature") as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, endpointSecret);
  } catch (err) {
    console.error(`Webhook signature verification failed:`, err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Handle the event
  switch (event.type) {
    case "checkout.session.completed":
      const session = event.data.object as Stripe.Checkout.Session;
      console.log(`Checkout session ${session.id} was completed!`);
      
      try {
        await connectDB();
        
        // Create or update purchase record
        await Purchase.findOneAndUpdate(
          { stripeSessionId: session.id },
          {
            userId: session.metadata?.userId || '',
            userEmail: session.metadata?.userEmail || session.customer_email || '',
            userName: session.metadata?.userName || '',
            stripeSessionId: session.id,
            amount: session.amount_total || 0,
            currency: session.currency || 'usd',
            paymentMethod: "stripe",
            status: "completed",
            updatedAt: new Date(),
          },
          {
            upsert: true,
            new: true,
          }
        );
        
        console.log(`Purchase created/updated for checkout session ${session.id}`);
      } catch (error) {
        console.error("Error updating purchase:", error);
      }
      break;

    case "payment_intent.succeeded":
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      console.log(`PaymentIntent ${paymentIntent.id} was successful!`);
      
      try {
        await connectDB();
        
        // Update purchase status in database (for legacy payment intents)
        await Purchase.findOneAndUpdate(
          { stripePaymentIntentId: paymentIntent.id },
          { 
            status: "completed",
            updatedAt: new Date()
          }
        );
        
        console.log(`Purchase updated for PaymentIntent ${paymentIntent.id}`);
      } catch (error) {
        console.error("Error updating purchase:", error);
      }
      break;

    case "payment_intent.payment_failed":
      const failedPayment = event.data.object as Stripe.PaymentIntent;
      console.log(`PaymentIntent ${failedPayment.id} failed!`);
      
      try {
        await connectDB();
        
        await Purchase.findOneAndUpdate(
          { stripePaymentIntentId: failedPayment.id },
          { 
            status: "failed",
            updatedAt: new Date()
          }
        );
      } catch (error) {
        console.error("Error updating failed payment:", error);
      }
      break;

    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  return NextResponse.json({ received: true });
}