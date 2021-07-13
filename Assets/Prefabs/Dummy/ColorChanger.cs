using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class ColorChanger : MonoBehaviour
{
    private Renderer renderer;

    private void Awake()
    {
        this.renderer = this.GetComponent<Renderer>();
    }

    private void OnMouseUpAsButton()
    {
        this.renderer.material.color = Random.ColorHSV();
    }
}
