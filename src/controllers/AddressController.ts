import { NextRequest } from 'next/server';
import { BaseController } from './BaseController';
import { User, Address } from '../models';
import { verifyAccessToken } from '../utils/jwt';

/**
 * Address Controller
 * Handles user address CRUD operations
 */
export class AddressController extends BaseController {



	/**
	 * GET /api/v1/profile/addresses
	 * List all user addresses
	 */
	async list(req: NextRequest) {
		try {
			const { user, error } = await this.verifyAuth(req);
			if (error) return error;

			const addresses = await Address.findAll({
				where: { user_id: user!.id },
				order: [['is_default', 'DESC'], ['created_at', 'DESC']],
			});

			return this.sendSuccess({ addresses });
		} catch (error: any) {
			return this.sendError(typeof error === 'object' && error !== null && 'message' in error ? (error as any).message : 'Unknown error', 500);
		}
	}

	/**
	 * POST /api/v1/profile/addresses
	 * Create new address
	 * Content-Type: application/json
	 */
	async create(req: NextRequest) {
		try {
			const { user, error } = await this.verifyAuth(req);
			if (error) return error;

			const body = await req.json();
			const {
				label, fullName, phone, phoneCountryCode,
				addressLine1, addressLine2, city, state, postalCode, country, isDefault,
			} = body;
        
            console.log("[AddressController] Create Body:", body);

            const missing = [];
            if (!fullName) missing.push('fullName');
            if (!phone) missing.push('phone');
            if (!addressLine1) missing.push('addressLine1');
            if (!city) missing.push('city');
            if (!postalCode) missing.push('postalCode');
            if (!country) missing.push('country');

            if (missing.length > 0) {
                return this.sendError(`Required fields missing: ${missing.join(', ')}`, 400);
            }

			// If setting as default, unset other defaults first
			if (isDefault) {
				await Address.update({ is_default: false }, { where: { user_id: user!.id } });
			}

			const address = await Address.create({
				user_id: user!.id,
				label: label || 'Home',
				full_name: fullName,
				phone,
				phone_country_code: phoneCountryCode,
				address_line1: addressLine1,
				address_line2: addressLine2,
				city,
				state,
				postal_code: postalCode,
				country,
				is_default: isDefault || false,
			});

			return this.sendSuccess({ address }, 'Address created', 201);
		} catch (error: any) {
			return this.sendError(typeof error === 'object' && error !== null && 'message' in error ? (error as any).message : 'Unknown error', 500);
		}
	}

	/**
	 * GET /api/v1/profile/addresses/:id
	 * Get address by ID
	 */
	async getById(req: NextRequest, context: { params: { id: string } }) {
		try {
			const { user, error } = await this.verifyAuth(req);
			if (error) return error;

			const address = await Address.findOne({
				where: { id: context.params.id, user_id: user!.id },
			});

			if (!address) {
				return this.sendError('Address not found', 404);
			}

			return this.sendSuccess({ address });
		} catch (error: any) {
			return this.sendError(typeof error === 'object' && error !== null && 'message' in error ? (error as any).message : 'Unknown error', 500);
		}
	}

	/**
	 * PUT /api/v1/profile/addresses/:id
	 * Update address
	 * Content-Type: application/json
	 */
	async update(req: NextRequest, context: { params: { id: string } }) {
		try {
			const { user, error } = await this.verifyAuth(req);
			if (error) return error;

			const address = await Address.findOne({
				where: { id: context.params.id, user_id: user!.id },
			});

			if (!address) {
				return this.sendError('Address not found', 404);
			}

			const body = await req.json();
			const {
				label, fullName, phone, phoneCountryCode,
				addressLine1, addressLine2, city, state, postalCode, country, isDefault,
			} = body;

			// If setting as default, unset other defaults first
			if (isDefault && !address.is_default) {
				await Address.update({ is_default: false }, { where: { user_id: user!.id } });
			}

			await address.update({
				label: label !== undefined ? label : address.label,
				full_name: fullName !== undefined ? fullName : address.full_name,
				phone: phone !== undefined ? phone : address.phone,
				phone_country_code: phoneCountryCode !== undefined ? phoneCountryCode : address.phone_country_code,
				address_line1: addressLine1 !== undefined ? addressLine1 : address.address_line1,
				address_line2: addressLine2 !== undefined ? addressLine2 : address.address_line2,
				city: city !== undefined ? city : address.city,
				state: state !== undefined ? state : address.state,
				postal_code: postalCode !== undefined ? postalCode : address.postal_code,
				country: country !== undefined ? country : address.country,
				is_default: isDefault !== undefined ? isDefault : address.is_default,
			});

			return this.sendSuccess({ message: 'Address updated', address });
		} catch (error: any) {
			return this.sendError(typeof error === 'object' && error !== null && 'message' in error ? (error as any).message : 'Unknown error', 500);
		}
	}

	/**
	 * DELETE /api/v1/profile/addresses/:id
	 * Delete address
	 */
	async delete(req: NextRequest, context: { params: { id: string } }) {
		try {
			const { user, error } = await this.verifyAuth(req);
			if (error) return error;

			const address = await Address.findOne({
				where: { id: context.params.id, user_id: user!.id },
			});

			if (!address) {
				return this.sendError('Address not found', 404);
			}

			await address.destroy();

			return this.sendSuccess({ message: 'Address deleted' });
		} catch (error: any) {
			return this.sendError(typeof error === 'object' && error !== null && 'message' in error ? (error as any).message : 'Unknown error', 500);
		}
	}

	/**
	 * POST /api/v1/profile/addresses/:id/default
	 * Set address as default
	 */
	async setDefault(req: NextRequest, context: { params: { id: string } }) {
		try {
			const { user, error } = await this.verifyAuth(req);
			if (error) return error;

			const address = await Address.findOne({
				where: { id: context.params.id, user_id: user!.id },
			});

			if (!address) {
				return this.sendError('Address not found', 404);
			}

			// Unset all other defaults
			await Address.update({ is_default: false }, { where: { user_id: user!.id } });

			// Set this one as default
			await address.update({ is_default: true });

			return this.sendSuccess({ message: 'Default address set', address });
		} catch (error: any) {
			return this.sendError(typeof error === 'object' && error !== null && 'message' in error ? (error as any).message : 'Unknown error', 500);
		}
	}
}
