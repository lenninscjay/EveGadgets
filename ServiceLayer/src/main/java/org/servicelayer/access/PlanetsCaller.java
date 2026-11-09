package org.servicelayer.access;

import java.util.List;

import org.servicelayer.models.PlanetDomain;
import org.servicelayer.models.ResourceDomain;
import org.servicelayer.shameful.SessionHolder;

public class PlanetsCaller {

	public static List<PlanetDomain> getPlanets() {
		List<PlanetDomain> result = SessionHolder.selectList("Planets.getPlanets");
		return result;
	}

	public static List<ResourceDomain> getResources() {
		List<ResourceDomain> result = SessionHolder.selectList("Planets.getResources");
		return result;
	}

}
