/**
 * Pict-Section-Dashboard API Provider
 *
 * Thin REST client that talks to retold-data-mapper's /mapper/* surface.
 * Centralizes scope handling: the active scope is read from localStorage
 * (key `retold.dataMapper.activeScope`) but can be overridden per-call.
 *
 * The host application doesn't have to know how the data-mapper REST is
 * shaped — it just calls listDashboards / loadDashboard / saveDashboard /
 * deleteDashboard / fetchPanelData and gets a Promise back.
 *
 * Bearer-token write gate: when WriteToken is set, POST/PUT/DELETE carry
 * `Authorization: Bearer <token>` to satisfy the data-mapper's
 * DATA_MAPPER_WRITE_TOKEN env-driven gate (Phase 2b hardening).
 * GET stays open.
 */
'use strict';

const SCOPE_STORAGE_KEY = 'retold.dataMapper.activeScope';

class DashboardAPIProvider
{
	constructor(pOptions)
	{
		let tmpOptions = pOptions || {};
		this._apiBaseUrl = tmpOptions.APIBaseUrl || '/mapper';
		this._scopeOverride = (typeof tmpOptions.Scope === 'string') ? tmpOptions.Scope : null;
		this._writeToken = (typeof tmpOptions.WriteToken === 'string' && tmpOptions.WriteToken.length > 0)
			? tmpOptions.WriteToken : null;
	}

	/**
	 * Resolve the active scope. Order: explicit per-call scope →
	 * provider option → localStorage → '' (global).
	 *
	 * localStorage access is wrapped in try/catch because some sandbox
	 * environments (jsdom with opaque origin, cross-origin iframes,
	 * private-mode browsers with quotas) throw on read.
	 */
	getScope(pCallScope)
	{
		if (typeof pCallScope === 'string') return pCallScope;
		if (typeof this._scopeOverride === 'string') return this._scopeOverride;
		try
		{
			if (typeof localStorage !== 'undefined')
			{
				let tmpStored = localStorage.getItem(SCOPE_STORAGE_KEY);
				if (tmpStored !== null) return tmpStored;
			}
		}
		catch (pErr) { /* opaque origin or disabled storage — fall through */ }
		return '';
	}

	setScope(pScope)
	{
		try
		{
			if (typeof localStorage !== 'undefined')
			{
				if (pScope) localStorage.setItem(SCOPE_STORAGE_KEY, pScope);
				else localStorage.removeItem(SCOPE_STORAGE_KEY);
			}
		}
		catch (pErr) { /* opaque origin or disabled storage — keep in-memory only */ }
		this._scopeOverride = (typeof pScope === 'string') ? pScope : null;
	}

	setWriteToken(pToken)
	{
		this._writeToken = (typeof pToken === 'string' && pToken.length > 0) ? pToken : null;
	}

	/**
	 * Internal fetch wrapper that surfaces non-2xx as rejected promises.
	 */
	_fetch(pMethod, pPath, pBody)
	{
		let tmpOpts = { method: pMethod, headers: {} };
		let tmpIsWrite = (pMethod !== 'GET' && pMethod !== 'HEAD');

		if (pBody !== undefined && pBody !== null)
		{
			tmpOpts.headers['Content-Type'] = 'application/json';
			tmpOpts.body = JSON.stringify(pBody);
		}
		if (tmpIsWrite && this._writeToken)
		{
			tmpOpts.headers['Authorization'] = 'Bearer ' + this._writeToken;
		}

		return fetch(this._apiBaseUrl + pPath, tmpOpts).then((pRes) =>
		{
			if (!pRes.ok)
			{
				return pRes.text().then((pText) =>
				{
					let tmpMsg = pText && pText.length < 300 ? pText : ('HTTP ' + pRes.status);
					throw new Error(tmpMsg);
				});
			}
			let tmpCT = pRes.headers.get('content-type') || '';
			if (tmpCT.indexOf('application/json') === 0) return pRes.json();
			return pRes.text();
		});
	}

	_scopeQuery(pScope)
	{
		let tmpScope = this.getScope(pScope);
		// Empty string scope is the default on the server; no need to send it.
		// '*' explicitly asks for cross-scope listing.
		if (tmpScope === '') return '';
		return '?scope=' + encodeURIComponent(tmpScope);
	}

	listDashboards(pScope)
	{
		return this._fetch('GET', '/dashboards' + this._scopeQuery(pScope));
	}

	loadDashboard(pHash, pScope)
	{
		return this._fetch('GET', '/dashboard/' + encodeURIComponent(pHash) + this._scopeQuery(pScope));
	}

	saveDashboard(pRecord, pScope)
	{
		// Caller's record can omit Scope; we inject the active one if so.
		let tmpRecord = Object.assign({}, pRecord);
		if (tmpRecord.Scope === undefined) tmpRecord.Scope = this.getScope(pScope);
		if (tmpRecord.IDDashboardConfig)
		{
			let tmpID = tmpRecord.IDDashboardConfig;
			delete tmpRecord.IDDashboardConfig;
			return this._fetch('PUT', '/dashboard/' + tmpID, tmpRecord);
		}
		return this._fetch('POST', '/dashboards', tmpRecord);
	}

	deleteDashboard(pID)
	{
		return this._fetch('DELETE', '/dashboard/' + pID);
	}

	fetchPanelData(pPanel, pPage, pPageSize)
	{
		return this._fetch('POST', '/dashboard/panel-data',
			{
				BeaconName:     pPanel.BeaconName,
				ConnectionName: pPanel.ConnectionName,
				Endpoint:       pPanel.Endpoint,
				PageSize:       pPageSize,
				Page:           pPage
			});
	}
}

module.exports = DashboardAPIProvider;
module.exports.SCOPE_STORAGE_KEY = SCOPE_STORAGE_KEY;
