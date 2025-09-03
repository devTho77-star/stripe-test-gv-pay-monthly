// netlify/functions/create-subscription.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  try {
    const { email, name, paymentMethodId, amount, donation_by } = JSON.parse(event.body);

    // Create a customer
    const customer = await stripe.customers.create({
      email,
      name,
      payment_method: paymentMethodId,
      invoice_settings: { default_payment_method: paymentMethodId },
      metadata: { donation_by: donation_by || '' }
    });

    // Create a product dynamically (or use an existing product ID)
    const product = await stripe.products.create({
      name: `Monthly Donation (${amount / 100} EUR)`,
    });

    // Create a price for monthly donation
    const price = await stripe.prices.create({
      unit_amount: amount, // in cents
      currency: 'eur',
      recurring: { interval: 'month' },
      product: product.id,
    });

    // Create subscription
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: price.id }],
      expand: ['latest_invoice.payment_intent'],
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        subscriptionId: subscription.id,
        clientSecret: subscription.latest_invoice.payment_intent.client_secret,
      }),
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 400,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
