// netlify/functions/create-subscription.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event, context) => {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const { amount, currency, donation_by } = JSON.parse(event.body);

    if (!amount || amount <= 0) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid amount' }) };
    }

    // 1. Create a product for recurring donation
    const product = await stripe.products.create({
      name: 'Monthly Donation',
      description: donation_by || 'Recurring donation',
    });

    // 2. Create a price for the subscription
    const price = await stripe.prices.create({
      unit_amount: amount,
      currency: currency,
      recurring: { interval: 'month' }, // ✅ Correct: 'month', not 'monthly'
      product: product.id,
    });

    // 3. Create a Stripe Customer (optional: you can attach email if needed)
    const customer = await stripe.customers.create();

    // 4. Create the subscription
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: price.id }],
      payment_behavior: 'default_incomplete',
      expand: ['latest_invoice.payment_intent'],
    });

    // Return the client secret to confirm payment on frontend
    const clientSecret = subscription.latest_invoice.payment_intent.client_secret;

    return {
      statusCode: 200,
      body: JSON.stringify({ clientSecret }),
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
