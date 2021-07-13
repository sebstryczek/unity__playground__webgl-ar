using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class TouchListener : MonoBehaviour
{
    public GameObject box;

    private void Awake()
    {
        box.GetComponent<Renderer>().material.color = Color.blue;
    }

    public void SetTouch(string val)
    {
        string[] pos = val.Split(","[0]);
        float x = float.Parse(pos[0].ToString());
        float y = float.Parse(pos[1].ToString());

        // TODO: Simulate Input.touch

        if (box.GetComponent<Renderer>().material.color == Color.red)
        {

            box.GetComponent<Renderer>().material.color = Color.blue;
        }
        else
        {
            box.GetComponent<Renderer>().material.color = Color.red;
        }
    }
}
