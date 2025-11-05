import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
  typescript: true,
})

export interface StripePaymentIntent {
  client_secret: string
  payment_intent_id: string
}

export async function createPaymentIntent(
  amount: number,
  currency: string = 'usd',
  metadata: Record<string, string> = {}
): Promise<StripePaymentIntent> {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency,
      metadata,
      automatic_payment_methods: {
        enabled: true,
      },
    })

    return {
      client_secret: paymentIntent.client_secret!,
      payment_intent_id: paymentIntent.id,
    }
  } catch (error) {
    console.error('Error creating payment intent:', error)
    throw new Error('Failed to create payment intent')
  }
}

export async function retrievePaymentIntent(paymentIntentId: string) {
  try {
    return await stripe.paymentIntents.retrieve(paymentIntentId)
  } catch (error) {
    console.error('Error retrieving payment intent:', error)
    throw new Error('Failed to retrieve payment intent')
  }
}

export async function createConnectedAccount(
  email: string,
  businessType: 'individual' | 'company' = 'individual'
) {
  try {
    const account = await stripe.accounts.create({
      type: 'express',
      email,
      business_type: businessType,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    })

    return {
      accountId: account.id,
      accountLink: await createAccountLink(account.id),
    }
  } catch (error) {
    console.error('Error creating connected account:', error)
    throw new Error('Failed to create connected account')
  }
}

export async function createAccountLink(accountId: string) {
  try {
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${process.env.NEXTAUTH_URL}/dashboard/settings/payments`,
      return_url: `${process.env.NEXTAUTH_URL}/dashboard/settings/payments?success=true`,
      type: 'account_onboarding',
    })

    return accountLink.url
  } catch (error) {
    console.error('Error creating account link:', error)
    throw new Error('Failed to create account link')
  }
}

export async function transferToConnectedAccount(
  amount: number,
  destinationAccountId: string,
  metadata: Record<string, string> = {}
) {
  try {
    const transfer = await stripe.transfers.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'usd',
      destination: destinationAccountId,
      metadata,
    })

    return transfer
  } catch (error) {
    console.error('Error creating transfer:', error)
    throw new Error('Failed to create transfer')
  }
}