package org.planetary.persist;

public class ExtractorSetupContainer {
	private Integer r;
	private Integer h;
    private Double y; // total units/hour for this extractor control unit
    public Double getY() { return y; }
    public void setY(Double y) { this.y = y; }
	
	public Integer getH() {
		return h;
	}
	public void setH(Integer h) {
		this.h = h;
	}
	public Integer getR() {
		return r;
	}
	public void setR(Integer r) {
		this.r = r;
	}

}
